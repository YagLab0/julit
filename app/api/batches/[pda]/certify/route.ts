import {
  address,
  getBase58Encoder,
  signature,
  type Signature,
} from "@solana/kit";
import {
  BatchStatus,
  CERTIFY_BATCH_DISCRIMINATOR,
  EuAssessment,
  fetchMaybeAudit,
  fetchMaybeBatch,
  findAuditPda,
  getCertifyBatchInstructionDataDecoder,
  JULIT_PROGRAM_ADDRESS,
} from "../../../../generated/julit";
import { jsonError, readJsonBody } from "../../../../lib/server/api";
import {
  bytesToHex,
  CERTIFICATES_BUCKET,
} from "../../../../lib/server/certificates";
import { createSolanaClient } from "../../../../lib/solana-client";
import { createClient } from "../../../../lib/supabase/server";
import { createServiceClient } from "../../../../lib/supabase/service";
import { verifyCertification, type CertifyInstructionFacts } from "./verify";

const BATCH_STATUS_NAMES = {
  [BatchStatus.Created]: "created",
  [BatchStatus.Audited]: "audited",
  [BatchStatus.Completed]: "completed",
} as const;

const EU_ASSESSMENT_NAMES = {
  [EuAssessment.Conformant]: "conformant",
  [EuAssessment.NonConformant]: "non_conformant",
} as const;

const HEX_DIGEST_RE = /^[0-9a-f]{64}$/;

/**
 * Indexes a certification after its certify_batch transaction confirms on
 * Devnet. Verifies the transaction, the decoded instruction accounts, the
 * on-chain batch/audit accounts, and that the stored certificate digest
 * matches the on-chain hash — then writes the audited index row. Findings
 * come only from the on-chain audit account.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pda: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Iniciá sesión para certificar lotes.", 401);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_type, wallet_address, wallet_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!company || company.company_type !== "auditor") {
    return jsonError("Solo las auditoras certifican lotes.", 403);
  }
  if (!company.wallet_address || !company.wallet_verified_at) {
    return jsonError("Vinculá la wallet verificada de tu empresa.", 400);
  }

  const { pda } = await params;

  let batchAddress;
  try {
    batchAddress = address(pda);
  } catch {
    return jsonError("La dirección del lote es inválida.", 400);
  }

  const service = createServiceClient();
  const { data: batch } = await service
    .from("batches")
    .select("pda_address, auditor_wallet, status")
    .eq("pda_address", pda)
    .maybeSingle();

  if (!batch) {
    return jsonError("Lote no encontrado.", 404);
  }
  if (batch.auditor_wallet !== company.wallet_address) {
    return jsonError("Este lote no está designado a tu wallet.", 403);
  }
  if (batch.status !== "created") {
    return jsonError("Este lote ya fue certificado.", 409);
  }

  const body = await readJsonBody(request);
  const txSignature = body?.signature;
  if (typeof txSignature !== "string" || !txSignature) {
    return jsonError("Falta la firma de la transacción.", 400);
  }

  let txSig: Signature;
  try {
    txSig = signature(txSignature);
  } catch {
    return jsonError("La firma de la transacción es inválida.", 400);
  }

  const { rpc } = createSolanaClient("devnet");
  const tx = await rpc
    .getTransaction(txSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding: "json",
    })
    .send();

  let certifyInstruction: CertifyInstructionFacts | null = null;
  if (tx && !tx.meta?.err) {
    const message = tx.transaction.message;
    const accountKeys = message.accountKeys as readonly string[];
    const ix = (
      message.instructions as unknown as {
        programIdIndex: number;
        accounts: number[];
        data: string;
      }[]
    ).find(
      (candidate) =>
        accountKeys[candidate.programIdIndex] === JULIT_PROGRAM_ADDRESS
    );

    if (ix) {
      const data = getBase58Encoder().encode(ix.data);
      const isCertify = CERTIFY_BATCH_DISCRIMINATOR.every(
        (byte, index) => data[index] === byte
      );
      if (isCertify) {
        try {
          const decoded = getCertifyBatchInstructionDataDecoder().decode(data);
          certifyInstruction = {
            batch: accountKeys[ix.accounts[0]],
            audit: accountKeys[ix.accounts[1]],
            auditor: accountKeys[ix.accounts[2]],
            auditHash: bytesToHex(decoded.auditHash),
          };
        } catch {
          certifyInstruction = null;
        }
      }
    }
  }

  const [expectedAuditPda] = await findAuditPda({ batch: batchAddress });

  const [batchAccount, auditAccount, storedObjects] = await Promise.all([
    fetchMaybeBatch(rpc, batchAddress, { commitment: "confirmed" }),
    fetchMaybeAudit(rpc, expectedAuditPda, { commitment: "confirmed" }),
    service.storage.from(CERTIFICATES_BUCKET).list(pda),
  ]);

  const storedDigests = (storedObjects.data ?? [])
    .map((object) => object.name.replace(/\.pdf$/, ""))
    .filter((name) => HEX_DIGEST_RE.test(name));

  const result = verifyCertification({
    auditorWallet: company.wallet_address,
    batchPda: pda,
    expectedAuditPda,
    indexStatus: batch.status,
    storedDigests,
    transaction: tx
      ? {
          signature: txSignature,
          slot: Number(tx.slot),
          failed: Boolean(tx.meta?.err),
          certifyInstruction,
        }
      : null,
    batchAccount: batchAccount.exists
      ? {
          programOwned: batchAccount.programAddress === JULIT_PROGRAM_ADDRESS,
          auditor: batchAccount.data.auditor,
          status: BATCH_STATUS_NAMES[batchAccount.data.status],
        }
      : null,
    auditAccount: auditAccount.exists
      ? {
          programOwned: auditAccount.programAddress === JULIT_PROGRAM_ADDRESS,
          auditHash: bytesToHex(auditAccount.data.auditHash),
          esgApproved: auditAccount.data.esgApproved,
          euAssessment: EU_ASSESSMENT_NAMES[auditAccount.data.euAssessment],
        }
      : null,
  });

  if (!result.ok) {
    return jsonError(result.rejection.message, result.rejection.status);
  }
  const certification = result.certification;

  const { data: updated, error } = await service
    .from("batches")
    .update({
      status: "audited",
      audit_sha256: certification.auditSha256,
      esg_approved: certification.esgApproved,
      eu_regulation_assessment: certification.euAssessment,
      audit_tx_signature: certification.auditTxSignature,
      observed_slot: certification.observedSlot,
    })
    .eq("pda_address", pda)
    .eq("status", "created")
    .select("pda_address, status")
    .maybeSingle();

  if (error) {
    return jsonError("No se pudo indexar la certificación.", 500);
  }
  if (!updated) {
    return jsonError("Este lote ya fue certificado.", 409);
  }

  return Response.json({ certification }, { status: 200 });
}
