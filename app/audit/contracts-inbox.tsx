"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ellipsify } from "../lib/explorer";
import type { ContractOffer, ContractStatus } from "./contracts";

const STATUS_LABELS: Record<ContractStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  revoked: "Rechazado",
};

const STATUS_STYLES: Record<ContractStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  revoked: "bg-secondary text-muted",
};

function OfferRow({
  offer,
  responding,
  onRespond,
}: {
  offer: ContractOffer;
  responding: boolean;
  onRespond: (id: string, status: ContractStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low p-4">
      <div>
        <p className="text-sm font-semibold">{offer.producerName}</p>
        {offer.producerWallet && (
          <p className="mt-0.5 font-mono text-xs text-muted">
            {ellipsify(offer.producerWallet, 4)}
          </p>
        )}
      </div>
      {offer.status === "pending" ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={responding}
            onClick={() => onRespond(offer.id, "revoked")}
            className="btn-secondary"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={responding}
            onClick={() => onRespond(offer.id, "accepted")}
            className="btn-primary"
          >
            Aceptar
          </button>
        </div>
      ) : (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[offer.status]}`}
        >
          {STATUS_LABELS[offer.status]}
        </span>
      )}
    </div>
  );
}

export function ContractsInbox({
  offers: initialOffers,
}: {
  offers: ContractOffer[];
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respond = async (id: string, status: ContractStatus) => {
    const offer = offers.find((o) => o.id === id);
    if (!offer) return;

    setRespondingId(id);
    try {
      const response = await fetch(`/api/companies/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: status === "accepted" ? "accept" : "decline",
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error ?? "No se pudo responder la oferta.");
        return;
      }

      setOffers((current) =>
        current.map((o) => (o.id === id ? { ...o, status } : o))
      );
      if (status === "accepted") {
        toast.success(`Contrato con ${offer.producerName} aceptado.`);
      } else {
        toast.info("Oferta rechazada.");
      }
    } catch {
      toast.error("No se pudo responder la oferta. Intentá de nuevo.");
    } finally {
      setRespondingId(null);
    }
  };

  const pending = offers.filter((o) => o.status === "pending");
  const history = offers.filter((o) => o.status !== "pending");

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="eyebrow">Contratos con productoras</p>

      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Todavía no recibiste ofertas de contrato.
        </p>
      ) : (
        <>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No tenés ofertas pendientes de respuesta.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {pending.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  responding={respondingId === offer.id}
                  onRespond={respond}
                />
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <p className="mt-5 text-xs font-semibold text-muted">Historial</p>
              <div className="mt-2 space-y-3">
                {history.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    responding={respondingId === offer.id}
                    onRespond={respond}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
