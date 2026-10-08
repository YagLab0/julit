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
import { buyerLotVerdict, type BuyerLotAction } from "./lot-actions";
import { useAccountDict } from "./i18n/context";
import { t, type AccountDict } from "./i18n";
import type { DesignatedLot } from "./account-client";

type Settlement = {
  usdcMint: Address;
  treasury: Address;
};

/** Confirm-modal copy for a buyer action, resolved from the dictionary. */
function confirmContent(
  dict: AccountDict,
  action: BuyerLotAction,
  lot: DesignatedLot
): { title: string; amountLabel: string; body: string; cta: string } {
  const c = dict.designated.confirm[action];
  const body =
    action === "redeem"
      ? lot.status === "disputed"
        ? dict.designated.confirm.redeem.bodyDisputed
        : dict.designated.confirm.redeem.bodyFunded
      : "body" in c
        ? c.body
        : "";
  return {
    title: t(c.title, { lot: lot.lot_id }),
    amountLabel: c.amountLabel,
    body,
    cta: c.cta,
  };
}

/**
 * The buyer's inbox: lots designated to the company that still await a
 * buyer decision (listed → fund, funded/disputed → redeem). The list is
 * always readable; only the action area requires the verified wallet.
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
  const dict = useAccountDict();
  return (
    <section className={`rounded-3xl bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{dict.designated.eyebrow}</h2>
          <p className="mt-0.5 text-xs text-muted">{dict.designated.sub}</p>
        </div>
        <span className="font-mono text-xs text-muted">
          {lots.length} {lots.length === 1 ? dict.common.lot : dict.common.lots}
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
  const dict = useAccountDict();
  const { settlement, dUsdcBalance, balanceFailed, deductBalance } =
    useSettlement(lots.length > 0 ? walletAddress : null);

  if (lots.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border-low p-6 text-center">
        <p className="text-xs font-medium text-muted">
          {dict.designated.empty}
        </p>
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
  const dict = useAccountDict();

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
      label: dict.common.viewTx,
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
      toast.error(dict.designated.toasts.connectWallet);
      return;
    }

    let txSignature: string;
    try {
      const instruction = await args.build(signer);
      txSignature = await send({ instructions: [instruction] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/reject|cancel|denied/i.test(message)) {
        toast.error(dict.common.cancelled);
      } else {
        toast.error(args.failureTitle, {
          description: message || dict.common.unexpected,
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
      toast.error(dict.designated.toasts.notIndexed, {
        description: body?.error ?? dict.designated.toasts.notIndexedDesc,
        action: {
          label: dict.designated.toasts.retry,
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
    toast.error(dict.designated.toasts.settlementError, {
      description: dict.designated.toasts.settlementErrorDesc,
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
      successTitle: t(dict.designated.toasts.funded, { lot: lot.lot_id }),
      successDescription: dict.designated.toasts.fundedDesc,
      failureTitle: dict.designated.toasts.fundError,
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
      successTitle: t(dict.designated.toasts.redeemed, { lot: lot.lot_id }),
      successDescription: dict.designated.toasts.redeemedDesc,
      failureTitle: dict.designated.toasts.redeemError,
    });
  }

  const handlers: Record<BuyerLotAction, () => void> = {
    fund,
    redeem,
  };

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {verdict.actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={busy || (action === "fund" && verdict.fundBlocker !== null)}
          onClick={() => setConfirming(action)}
          className="btn-primary text-xs px-3 py-1.5 cursor-pointer"
        >
          {dict.designated.actions[action]}
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
          <StatusBadge status={lot.status} labels={dict.lotStatus} />
          {verdict.timeoutClaimLive && (
            <Chip tone="warn">{dict.designated.timeoutClaimLive}</Chip>
          )}
        </div>
        <Link
          href={`/batch/${lot.pda_address}`}
          className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
        >
          {dict.common.viewPassport}
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

      <LotClockNote lot={lot} dict={dict} />

      {verdict.actions.length > 0 ? (
        <div className="mt-3 border-t border-border-low pt-3">
          {walletAddress ? (
            <VerifiedWalletGate
              name={companyName}
              walletAddress={walletAddress}
              action={t(dict.designated.gate.action, { lot: lot.lot_id })}
              signAs={dict.designated.gate.signAs}
            >
              {actionButtons}
            </VerifiedWalletGate>
          ) : (
            actionButtons
          )}
          {verdict.fundBlocker && verdict.actions.includes("fund") && (
            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              {balanceFailed
                ? dict.designated.fundBlocker.readError
                : verdict.fundBlocker === "checking_balance"
                  ? dict.designated.fundBlocker.checking
                  : dict.designated.fundBlocker.insufficient}
              {!balanceFailed &&
                verdict.fundBlocker === "insufficient_balance" &&
                dUsdcBalance !== null &&
                ` ${t(dict.designated.fundBlocker.balance, { balance: priceFmt.format(dUsdcBalance) })}`}
            </p>
          )}
        </div>
      ) : verdict.walletBlocked ? (
        <p className="mt-3 border-t border-border-low pt-3 text-[11px] text-muted">
          {dict.designated.walletBlocked}
        </p>
      ) : null}

      {confirming &&
        (() => {
          const content = confirmContent(dict, confirming, lot);
          return (
            <Modal
              onClose={() => setConfirming(null)}
              labelledBy={`lot-action-title-${lot.lot_id}`}
            >
              <div className="p-6">
                <h3
                  id={`lot-action-title-${lot.lot_id}`}
                  className="text-base font-semibold text-foreground"
                >
                  {content.title}
                </h3>

                <dl className="mt-4 space-y-2 text-xs">
                  <ConfirmRow label={dict.designated.rows.producer}>
                    {lot.producer_name ?? ellipsify(lot.producer_wallet, 6)}
                  </ConfirmRow>
                  <ConfirmRow label={content.amountLabel}>
                    {priceFmt.format(lot.price_usdc)} dUSDC
                  </ConfirmRow>
                  {confirming === "fund" && (
                    <ConfirmRow label={dict.designated.rows.balance}>
                      {dUsdcBalance === null
                        ? balanceFailed
                          ? dict.designated.rows.balanceError
                          : dict.designated.rows.balanceLoading
                        : `${priceFmt.format(dUsdcBalance)} dUSDC`}
                    </ConfirmRow>
                  )}
                  <ConfirmRow label={dict.designated.rows.deadline}>
                    {dateFmt.format(new Date(lot.claimable_after))}
                  </ConfirmRow>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-muted">
                  {content.body}
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
                      ? dict.common.signing
                      : indexing
                        ? dict.common.indexing
                        : content.cta}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(null)}
                    className="btn-secondary text-xs px-4 py-2 cursor-pointer"
                  >
                    {dict.common.back}
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}
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
function LotClockNote({
  lot,
  dict,
}: {
  lot: DesignatedLot;
  dict: AccountDict;
}) {
  const deadline = dateFmt.format(new Date(lot.claimable_after));

  if (lot.status === "disputed") {
    return (
      <p className="mt-1 text-[11px] text-muted">
        {dict.designated.clock.disputed}
      </p>
    );
  }

  if (lot.status === "funded") {
    return (
      <p className="mt-1 text-[11px] text-muted">
        {t(dict.designated.clock.funded, { deadline })}
      </p>
    );
  }

  return (
    <p className="mt-1 text-[11px] text-muted">
      {t(dict.designated.clock.listed, { deadline })}
    </p>
  );
}
