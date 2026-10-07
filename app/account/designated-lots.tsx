"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  address,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { toast } from "sonner";
import {
  fetchConfig,
  findConfigPda,
  findMintPda,
  getFundLotInstructionAsync,
  getRaiseDisputeInstruction,
  getRedeemLotInstructionAsync,
} from "../generated/julit";
import { useCluster } from "../components/cluster-context";
import { Modal } from "../explorer/components/modal";
import {
  Chip,
  StatusBadge,
  dateFmt,
  decimalFmt,
  integerFmt,
  priceFmt,
} from "../explorer/components/lot-display";
import { VerifiedWalletGate } from "../components/verified-wallet-gate";
import { ellipsify } from "../lib/explorer";
import { originName } from "../lib/origins";
import { findAssociatedTokenAddress } from "../lib/solana/ata";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useSolanaClient } from "../lib/solana-client-context";
import { useWallet } from "../lib/wallet/context";
import {
  buyerLotVerdict,
  type BuyerLotAction,
  type FundBlocker,
} from "./lot-actions";
import type { DesignatedLot } from "./account-client";

type Settlement = {
  usdcMint: Address;
  treasury: Address;
};

const FUND_BLOCKER_HINTS: Record<FundBlocker, string> = {
  checking_balance: "Verificando tu saldo dUSDC…",
  insufficient_balance: "Saldo dUSDC insuficiente para el precio del lote.",
};

const ACTION_LABELS: Record<BuyerLotAction, string> = {
  fund: "Comprar con escrow",
  redeem: "Confirmar recepción",
  dispute: "Disputar",
};

const CONFIRM_CONTENT: Record<
  BuyerLotAction,
  {
    title: (lot: DesignatedLot) => string;
    amountLabel: string;
    body: (lot: DesignatedLot) => string;
    cta: string;
  }
> = {
  fund: {
    title: (lot) => `Comprar ${lot.lot_id} con escrow`,
    amountLabel: "Precio del lote",
    body: () =>
      "Depositás el precio total en el escrow del lote. Se libera a la productora cuando confirmes la recepción; si no confirmás ni disputás antes del límite, la productora puede cobrarlo.",
    cta: "Firmar y depositar",
  },
  redeem: {
    title: (lot) => `Confirmar recepción de ${lot.lot_id}`,
    amountLabel: "Monto en escrow",
    body: (lot) =>
      lot.status === "disputed"
        ? "El lote está en disputa: liberar el pago custodiado es la resolución on-chain a favor de la productora. El Título Digital se da de baja."
        : "Liberás el pago custodiado a la productora (menos la comisión del protocolo) y el Título Digital se da de baja. Es la confirmación de que recibiste el cargamento.",
    cta: "Firmar y liberar pago",
  },
  dispute: {
    title: (lot) => `Disputar ${lot.lot_id}`,
    amountLabel: "Monto en escrow",
    body: () =>
      "La disputa congela el cobro por timeout de la productora mientras resuelven el problema fuera de la cadena. La única salida on-chain es que confirmes la recepción — no hay devolución de fondos.",
    cta: "Firmar disputa",
  },
};

/**
 * The buyer's inbox: lots designated to the company that still await a
 * buyer decision (listed → fund, funded → redeem/dispute, disputed →
 * redeem). The list is always readable; only the action area requires
 * the verified wallet.
 */
export function DesignatedLotsCard({
  lots,
  companyName,
  walletAddress,
  className,
}: {
  lots: DesignatedLot[];
  companyName: string;
  walletAddress: string | null;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Lotes designados</h2>
          <p className="mt-0.5 text-xs text-muted">
            Lotes que una productora te reservó y esperan tu decisión.
          </p>
        </div>
        <span className="font-mono text-xs text-muted">
          {lots.length} {lots.length === 1 ? "lote" : "lotes"}
        </span>
      </div>

      <DesignatedLotList
        lots={lots}
        companyName={companyName}
        walletAddress={walletAddress}
      />
    </section>
  );
}

type SettlementState = {
  settlement: Settlement | null;
  dUsdcBalance: number | null;
  balanceFailed: boolean;
};

/**
 * The settlement mint and treasury come from the on-chain Config; the
 * balance read is the buyer's dUSDC ATA (missing account = zero balance).
 * Fetched once per list — every designated lot shares mint and buyer.
 * `deductBalance` keeps the hint honest after a successful Funding.
 */
function useSettlement(buyerWallet: string | null): SettlementState & {
  deductBalance: (amount: number) => void;
} {
  const client = useSolanaClient();
  const [state, setState] = useState<SettlementState>({
    settlement: null,
    dUsdcBalance: null,
    balanceFailed: false,
  });

  useEffect(() => {
    if (!buyerWallet) return;
    let cancelled = false;
    (async () => {
      try {
        const [configPda] = await findConfigPda();
        const config = await fetchConfig(client.rpc, configPda, {
          commitment: "confirmed",
        });
        const usdcMint = config.data.usdcMint;
        const treasury = config.data.treasury;
        const [ata] = await findAssociatedTokenAddress(
          address(buyerWallet),
          usdcMint
        );
        // getAccountInfo resolves null for a missing ATA — zero balance —
        // while real RPC failures surface as `balanceFailed`.
        const account = await client.rpc
          .getAccountInfo(ata, { encoding: "jsonParsed" })
          .send();
        let balance = 0;
        if (account.value) {
          const parsed = account.value.data as {
            parsed?: { info?: { tokenAmount?: { uiAmountString?: string } } };
          };
          balance = Number(
            parsed.parsed?.info?.tokenAmount?.uiAmountString ?? 0
          );
        }
        if (!cancelled) {
          setState({
            settlement: { usdcMint, treasury },
            dUsdcBalance: balance,
            balanceFailed: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, balanceFailed: true }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, buyerWallet]);

  function deductBalance(amount: number) {
    setState((s) =>
      s.dUsdcBalance === null
        ? s
        : { ...s, dUsdcBalance: Math.max(0, s.dUsdcBalance - amount) }
    );
  }

  return { ...state, deductBalance };
}

function DesignatedLotList({
  lots,
  companyName,
  walletAddress,
}: {
  lots: DesignatedLot[];
  companyName: string;
  walletAddress: string | null;
}) {
  const { settlement, dUsdcBalance, balanceFailed, deductBalance } =
    useSettlement(lots.length > 0 ? walletAddress : null);

  if (lots.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border-low p-6 text-center">
        <p className="text-xs font-medium text-muted">
          Ninguna productora te designó lotes todavía.
        </p>
        <p className="mt-1 text-xs text-muted">
          Necesitás un contrato comercial aceptado para que te reserven lotes.
        </p>
        <Link
          href="/account/contratos"
          className="btn-secondary mt-3 inline-block rounded-full px-4 py-1.5 text-xs"
        >
          Solicitar contrato
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {lots.map((lot) => (
        <DesignatedLotRow
          key={lot.pda_address}
          lot={lot}
          companyName={companyName}
          walletAddress={walletAddress}
          settlement={settlement}
          dUsdcBalance={dUsdcBalance}
          balanceFailed={balanceFailed}
          deductBalance={deductBalance}
        />
      ))}
    </div>
  );
}

function DesignatedLotRow({
  lot,
  companyName,
  walletAddress,
  settlement,
  dUsdcBalance,
  balanceFailed,
  deductBalance,
}: {
  lot: DesignatedLot;
  companyName: string;
  walletAddress: string | null;
  settlement: Settlement | null;
  dUsdcBalance: number | null;
  balanceFailed: boolean;
  deductBalance: (amount: number) => void;
}) {
  const router = useRouter();
  const { wallet, signer } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();

  const [confirming, setConfirming] = useState<BuyerLotAction | null>(null);
  const [indexing, setIndexing] = useState(false);

  const claimableAfterUnix = Math.floor(Date.parse(lot.claimable_after) / 1000);
  // Snapshot at mount — the claim clock flag is honest enough for a page view.
  const [nowUnixSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const verdict = buyerLotVerdict({
    status: lot.status,
    connectedWallet: wallet?.account.address ?? null,
    buyerWallet: lot.buyer_wallet,
    dUsdcBalance,
    priceUsdc: lot.price_usdc,
    claimableAfterUnix,
    nowUnixSeconds,
  });

  const busy = isSending || indexing;

  function explorerAction(txSignature: string) {
    return {
      label: "Ver transacción",
      onClick: () =>
        window.open(getExplorerUrl(`/tx/${txSignature}`), "_blank"),
    };
  }

  /** Shared sign → index → refresh flow for every lot transition. */
  async function runTransition(args: {
    build: (signer: TransactionSigner) => Promise<Instruction> | Instruction;
    endpoint: string;
    successTitle: string;
    successDescription: string;
    failureTitle: string;
    onSuccess?: () => void;
  }) {
    if (!signer) {
      toast.error("Conectá la wallet verificada para firmar.");
      return;
    }

    let txSignature: string;
    try {
      const instruction = await args.build(signer);
      txSignature = await send({ instructions: [instruction] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(message)) {
        toast.error("Cancelaste la firma.");
      } else {
        toast.error(args.failureTitle, {
          description: message || "Error inesperado.",
        });
      }
      return;
    }

    // From here the transaction is on-chain: a failure means it did not
    // index, not that it did not land. The endpoint re-verifies the same
    // signature, so a failed POST is safe to retry from the toast.
    const indexAndReport = async (): Promise<boolean> => {
      const response = await fetch(args.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_pda: lot.pda_address,
          tx_signature: txSignature,
        }),
      }).catch(() => null);

      if (response?.ok) return true;

      const body = response
        ? ((await response.json().catch(() => null)) as {
            error?: string;
          } | null)
        : null;
      toast.error("La transacción quedó on-chain pero no se indexó", {
        description: body?.error ?? "Reintentá la indexación más tarde.",
        action: {
          label: "Reintentar",
          onClick: () => void retryIndex(),
        },
        cancel: explorerAction(txSignature),
      });
      return false;
    };

    const onIndexed = () => {
      toast.success(args.successTitle, {
        description: args.successDescription,
        action: explorerAction(txSignature),
      });
      args.onSuccess?.();
      setConfirming(null);
      router.refresh();
    };

    const retryIndex = async () => {
      setIndexing(true);
      const ok = await indexAndReport();
      setIndexing(false);
      if (ok) onIndexed();
    };

    setIndexing(true);
    const ok = await indexAndReport();
    setIndexing(false);
    if (ok) onIndexed();
  }

  function requireSettlement(): Settlement | null {
    if (settlement) return settlement;
    toast.error("No se pudo cargar la configuración del protocolo.", {
      description: "Recargá la página e intentá de nuevo.",
    });
    return null;
  }

  function fund() {
    if (verdict.fundBlocker) return;
    const config = requireSettlement();
    if (!config) return;
    void runTransition({
      build: (buyer) =>
        getFundLotInstructionAsync({
          lot: address(lot.pda_address),
          buyer,
          usdcMint: config.usdcMint,
        }),
      endpoint: "/api/lots/fund",
      successTitle: `Lote ${lot.lot_id} fondeado`,
      successDescription:
        "El pago quedó custodiado en el escrow e indexado como fondeado.",
      failureTitle: "No se pudo fondear el lote.",
      onSuccess: () => deductBalance(lot.price_usdc),
    });
  }

  function redeem() {
    const config = requireSettlement();
    if (!config) return;
    void runTransition({
      build: async (buyer) => {
        const [mint] = await findMintPda({ lot: address(lot.pda_address) });
        return getRedeemLotInstructionAsync({
          lot: address(lot.pda_address),
          buyer,
          mint,
          producer: address(lot.producer_wallet),
          treasury: config.treasury,
          usdcMint: config.usdcMint,
        });
      },
      endpoint: "/api/lots/redeem",
      successTitle: `Recepción confirmada — lote ${lot.lot_id} liquidado`,
      successDescription:
        "El escrow se liberó a la productora y el Título Digital quedó dado de baja.",
      failureTitle: "No se pudo confirmar la recepción.",
    });
  }

  function dispute() {
    void runTransition({
      build: (buyer) =>
        getRaiseDisputeInstruction({
          lot: address(lot.pda_address),
          buyer,
        }),
      endpoint: "/api/lots/dispute",
      successTitle: `Lote ${lot.lot_id} en disputa`,
      successDescription:
        "El cobro por timeout de la productora quedó congelado.",
      failureTitle: "No se pudo abrir la disputa.",
    });
  }

  const handlers: Record<BuyerLotAction, () => void> = {
    fund,
    redeem,
    dispute,
  };

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {verdict.actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={busy || (action === "fund" && verdict.fundBlocker !== null)}
          onClick={() => setConfirming(action)}
          className={`text-xs px-3 py-1.5 cursor-pointer ${
            action === "dispute" ? "btn-secondary" : "btn-primary"
          }`}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  );

  return (
    <article className="rounded-xl border border-border-low bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-foreground">
            {lot.lot_id}
          </span>
          <StatusBadge status={lot.status} />
          {verdict.timeoutClaimLive && (
            <Chip tone="warn">La productora ya puede cobrar</Chip>
          )}
        </div>
        <Link
          href={`/batch/${lot.pda_address}`}
          className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
        >
          Ver Pasaporte
        </Link>
      </div>

      <p className="mt-1 text-xs text-muted">
        {lot.producer_name ?? ellipsify(lot.producer_wallet, 6)}
        {" · "}
        {originName(lot.origin_id) ?? lot.origin_id}
      </p>

      <p className="mt-1 text-xs text-muted">
        {integerFmt.format(lot.volume_tonnes)} t ·{" "}
        {decimalFmt.format(lot.purity_pct)} % Li₂CO₃ ·{" "}
        <span className="font-semibold text-foreground">
          {priceFmt.format(lot.price_usdc)} dUSDC
        </span>
      </p>

      <LotClockNote lot={lot} />

      {verdict.actions.length > 0 ? (
        <div className="mt-3 border-t border-border-low pt-3">
          {walletAddress ? (
            <VerifiedWalletGate
              name={companyName}
              walletAddress={walletAddress}
              action={`operar ${lot.lot_id}`}
              signAs="firmar como compradora"
            >
              {actionButtons}
            </VerifiedWalletGate>
          ) : (
            actionButtons
          )}
          {verdict.fundBlocker && verdict.actions.includes("fund") && (
            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              {balanceFailed
                ? "No se pudo leer tu saldo dUSDC. Recargá la página."
                : FUND_BLOCKER_HINTS[verdict.fundBlocker]}
              {!balanceFailed &&
                verdict.fundBlocker === "insufficient_balance" &&
                dUsdcBalance !== null &&
                ` Tenés ${priceFmt.format(dUsdcBalance)} dUSDC.`}
            </p>
          )}
        </div>
      ) : verdict.walletBlocked ? (
        <p className="mt-3 border-t border-border-low pt-3 text-[11px] text-muted">
          Conectá la wallet verificada de tu empresa para operar este lote.
        </p>
      ) : null}

      {confirming && (
        <Modal
          onClose={() => setConfirming(null)}
          labelledBy={`lot-action-title-${lot.lot_id}`}
        >
          <div className="p-6">
            <h3
              id={`lot-action-title-${lot.lot_id}`}
              className="text-base font-semibold text-foreground"
            >
              {CONFIRM_CONTENT[confirming].title(lot)}
            </h3>

            <dl className="mt-4 space-y-2 text-xs">
              <ConfirmRow label="Productora">
                {lot.producer_name ?? ellipsify(lot.producer_wallet, 6)}
              </ConfirmRow>
              <ConfirmRow label={CONFIRM_CONTENT[confirming].amountLabel}>
                {priceFmt.format(lot.price_usdc)} dUSDC
              </ConfirmRow>
              {confirming === "fund" && (
                <ConfirmRow label="Tu saldo dUSDC">
                  {dUsdcBalance === null
                    ? balanceFailed
                      ? "No se pudo leer"
                      : "Verificando…"
                    : `${priceFmt.format(dUsdcBalance)} dUSDC`}
                </ConfirmRow>
              )}
              <ConfirmRow label="Límite de recepción">
                {dateFmt.format(new Date(lot.claimable_after))}
              </ConfirmRow>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              {CONFIRM_CONTENT[confirming].body(lot)}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  busy ||
                  (confirming === "fund" && verdict.fundBlocker !== null)
                }
                onClick={handlers[confirming]}
                className="btn-primary text-xs px-4 py-2 cursor-pointer"
              >
                {isSending
                  ? "Firmando…"
                  : indexing
                    ? "Indexando…"
                    : CONFIRM_CONTENT[confirming].cta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(null)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}

function ConfirmRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** The claim clock line under each pending lot. */
function LotClockNote({ lot }: { lot: DesignatedLot }) {
  const deadline = dateFmt.format(new Date(lot.claimable_after));

  if (lot.status === "disputed") {
    return (
      <p className="mt-1 text-[11px] text-muted">
        Disputa abierta: el cobro por timeout de la productora está congelado.
      </p>
    );
  }

  if (lot.status === "funded") {
    return (
      <p className="mt-1 text-[11px] text-muted">
        Si no confirmás ni disputás antes del {deadline}, la productora puede
        cobrar el escrow.
      </p>
    );
  }

  return (
    <p className="mt-1 text-[11px] text-muted">
      Tenés que confirmar la recepción antes del {deadline}.
    </p>
  );
}
