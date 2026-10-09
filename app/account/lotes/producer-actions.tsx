"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { address } from "@solana/kit";
import {
  findMintPda,
  getClaimTimeoutInstructionAsync,
  getMarkShippedInstruction,
} from "../../generated/julit";
import { Modal } from "../../explorer/components/modal";
import { dateFmt, priceFmt } from "../../explorer/components/lot-display";
import { ellipsify } from "../../lib/explorer";
import { fetchProtocolConfig } from "../../lib/solana/config";
import { useNowSecs } from "../../lib/hooks/use-now";
import { useSolanaClient } from "../../lib/solana-client-context";
import { useWallet } from "../../lib/wallet/context";
import { calculateLotSettlement, producerLotVerdict } from "../lot-actions";
import { useLotTransition } from "../designated-lots";
import { useAccountDict } from "../i18n/context";
import { t } from "../i18n";
import type { ProducerLot } from "../account-data";

/** SHA-256 hex of a file picked by the producer (bill of lading). */
async function hashFile(
  file: File
): Promise<{ bytes: Uint8Array; hex: string }> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer()
  );
  const bytes = new Uint8Array(digest);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { bytes, hex };
}

/** Seconds remaining rendered as a compact countdown. */
export function formatCountdown(secs: number): string {
  const total = Math.max(0, Math.floor(secs));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

type PendingShip = { fileName: string; bytes: Uint8Array; hex: string };

/**
 * The producer's lot actions inside a lot grid card: "Mark as shipped"
 * posts the bill-of-lading hash before ship_by; "Claim payment" settles
 * the escrow once the buyer confirmation window elapses. The card root
 * is a Link, so clicks are default-prevented to keep it from navigating.
 */
export function ProducerLotAction({
  lot,
  walletAddress,
}: {
  lot: ProducerLot;
  walletAddress: string;
}) {
  const dict = useAccountDict();
  const d = dict.producerActions;
  const client = useSolanaClient();
  const { wallet } = useWallet();
  const { runTransition, isSending, indexing } = useLotTransition(
    lot.pda_address
  );

  const now = useNowSecs();
  const nowSecs = now ?? 0;
  const shipBySecs = Math.floor(Date.parse(lot.ship_by) / 1000);
  const shippedAtSecs = lot.shipped_at
    ? Math.floor(Date.parse(lot.shipped_at) / 1000)
    : null;

  const verdict = producerLotVerdict({
    status: lot.status as never,
    connectedWallet: wallet?.account.address ?? null,
    producerWallet: walletAddress,
    shipBySecs,
    shippedAtSecs,
    confirmWindowSecs: Number(lot.confirm_window_secs ?? 0),
    nowSecs,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [pendingShip, setPendingShip] = useState<PendingShip | null>(null);

  const busy = isSending || indexing;

  async function handleBlFile(file: File | null) {
    if (!file) return;
    setHashing(true);
    try {
      const { bytes, hex } = await hashFile(file);
      setPendingShip({ fileName: file.name, bytes, hex });
    } catch {
      setPendingShip(null);
      toast.error(d.toasts.blHashError);
    } finally {
      setHashing(false);
    }
  }

  function ship() {
    if (!pendingShip) return;
    const blHash = pendingShip.bytes;
    void runTransition({
      build: (producer) =>
        getMarkShippedInstruction({
          lot: address(lot.pda_address),
          producer,
          blHash,
        }),
      endpoint: "/api/lots/ship",
      successTitle: t(d.toasts.shipped, { lot: lot.lot_id }),
      successDescription: d.toasts.shippedDesc,
      failureTitle: d.toasts.shipError,
      onSuccess: () => {
        setPendingShip(null);
        setShipOpen(false);
      },
    });
  }

  function claim() {
    void runTransition({
      build: async (producer) => {
        const [mint] = await findMintPda({
          lot: address(lot.pda_address),
        });
        const config = await fetchProtocolConfig(client.rpc);
        return getClaimTimeoutInstructionAsync({
          lot: address(lot.pda_address),
          producer,
          mint,
          treasury: config.treasury,
          usdcMint: config.usdcMint,
        });
      },
      endpoint: "/api/lots/claim",
      successTitle: t(d.toasts.claimed, { lot: lot.lot_id }),
      successDescription: d.toasts.claimedDesc,
      failureTitle: d.toasts.claimError,
      onSuccess: () => setClaimOpen(false),
    });
  }

  const claimUnlockSecs =
    shippedAtSecs !== null
      ? shippedAtSecs + Number(lot.confirm_window_secs ?? 0)
      : null;

  // Nothing to render for statuses with no pending producer deadline.
  const showShipExpired = lot.status === "funded" && nowSecs > shipBySecs;
  const showClaimCountdown =
    lot.status === "shipped" &&
    claimUnlockSecs !== null &&
    !verdict.actions.includes("claim");

  if (
    now === null ||
    (!verdict.actions.length &&
      !verdict.walletBlocked &&
      !showShipExpired &&
      !showClaimCountdown)
  ) {
    return null;
  }

  const settlement = calculateLotSettlement(
    Number(lot.price_usdc || 0),
    lot.fee_bps ?? 100
  );

  return (
    <div onClick={(e) => e.preventDefault()} className="mt-3">
      {verdict.actions.includes("ship") && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShipOpen(true)}
            className="btn-primary w-full cursor-pointer px-4 py-2.5 text-xs"
          >
            {d.actions.ship}
          </button>
          <p className="mt-1 text-[11px] text-muted">
            {t(d.shipHint, {
              date: dateFmt.format(new Date(lot.ship_by)),
              left: formatCountdown(shipBySecs - nowSecs),
            })}
          </p>
        </>
      )}

      {showShipExpired && (
        <p className="mt-1 text-[11px] text-amber-700">{d.shipExpiredHint}</p>
      )}

      {verdict.actions.includes("claim") && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setClaimOpen(true)}
          className="btn-primary w-full cursor-pointer px-4 py-2.5 text-xs"
        >
          {d.actions.claim} · {priceFmt.format(settlement.producerPayoutUsdc)}{" "}
          dUSDC
        </button>
      )}

      {showClaimCountdown && claimUnlockSecs !== null && (
        <p className="mt-1 text-[11px] text-muted">
          {t(d.claimHint, {
            left: formatCountdown(claimUnlockSecs - nowSecs),
          })}
        </p>
      )}

      {verdict.walletBlocked && (
        <p className="mt-1 text-[11px] text-muted">{d.walletBlocked}</p>
      )}

      {shipOpen && (
        <Modal
          onClose={() => {
            setShipOpen(false);
            setPendingShip(null);
          }}
          labelledBy={`ship-title-${lot.lot_id}`}
        >
          <div className="p-6">
            <h3
              id={`ship-title-${lot.lot_id}`}
              className="text-base font-semibold text-foreground"
            >
              {t(d.confirm.ship.title, { lot: lot.lot_id })}
            </h3>

            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{d.confirm.ship.blLabel}</dt>
                <dd className="font-medium text-foreground">
                  {pendingShip?.fileName ?? d.confirm.ship.blEmpty}
                </dd>
              </div>
              {pendingShip && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">SHA-256</dt>
                  <dd className="font-mono font-medium text-foreground">
                    {ellipsify(pendingShip.hex, 10)}
                  </dd>
                </div>
              )}
            </dl>

            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleBlFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-secondary mt-4 w-full cursor-pointer px-4 py-2 text-xs"
            >
              {pendingShip
                ? d.confirm.ship.changeFile
                : d.confirm.ship.pickFile}
            </button>
            {hashing && (
              <p className="mt-1 text-[11px] text-muted">
                {d.confirm.ship.hashing}
              </p>
            )}

            <p className="mt-4 text-xs leading-relaxed text-muted">
              {d.confirm.ship.body}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || hashing || !pendingShip}
                onClick={ship}
                className="btn-primary text-xs px-4 py-2 cursor-pointer"
              >
                {isSending
                  ? dict.common.signing
                  : indexing
                    ? dict.common.indexing
                    : d.confirm.ship.cta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShipOpen(false);
                  setPendingShip(null);
                }}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                {dict.common.back}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {claimOpen && (
        <Modal
          onClose={() => setClaimOpen(false)}
          labelledBy={`claim-title-${lot.lot_id}`}
        >
          <div className="p-6">
            <h3
              id={`claim-title-${lot.lot_id}`}
              className="text-base font-semibold text-foreground"
            >
              {t(d.confirm.claim.title, { lot: lot.lot_id })}
            </h3>

            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{d.confirm.claim.priceLabel}</dt>
                <dd className="font-medium text-foreground">
                  {priceFmt.format(Number(lot.price_usdc || 0))} dUSDC
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{d.confirm.claim.feeLabel}</dt>
                <dd className="font-medium text-foreground">
                  {priceFmt.format(settlement.feeUsdc)} dUSDC (
                  {settlement.feeBps / 100}%)
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{d.confirm.claim.payoutLabel}</dt>
                <dd className="font-semibold text-foreground">
                  {priceFmt.format(settlement.producerPayoutUsdc)} dUSDC
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              {d.confirm.claim.body}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={claim}
                className="btn-primary text-xs px-4 py-2 cursor-pointer"
              >
                {isSending
                  ? dict.common.signing
                  : indexing
                    ? dict.common.indexing
                    : d.confirm.claim.cta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setClaimOpen(false)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                {dict.common.back}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
