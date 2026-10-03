"use client";

import { useReducer } from "react";
import { toast } from "sonner";
import { ellipsify } from "../lib/explorer";
import {
  demoContractOffers,
  type ContractStatus,
  type DemoContractOffer,
} from "./demo-data";

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
  onRespond,
}: {
  offer: DemoContractOffer;
  onRespond: (id: string, status: ContractStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-low p-4">
      <div>
        <p className="text-sm font-semibold">{offer.producerName}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">
          {ellipsify(offer.producerWallet, 4)}
        </p>
      </div>
      {offer.status === "pending" ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRespond(offer.id, "revoked")}
            className="btn-secondary"
          >
            Rechazar
          </button>
          <button
            type="button"
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

export function ContractsInbox() {
  // Responses mutate the demo store like certifications do; the reducer
  // version just re-renders after each mutation.
  const [, bumpVersion] = useReducer((v: number) => v + 1, 0);

  const respond = (id: string, status: ContractStatus) => {
    const offer = demoContractOffers.find((o) => o.id === id);
    if (!offer) return;
    offer.status = status;
    bumpVersion();
    if (status === "accepted") {
      toast.success(`Contrato con ${offer.producerName} aceptado.`);
    } else {
      toast.info("Oferta rechazada.");
    }
  };

  const pending = demoContractOffers.filter((o) => o.status === "pending");
  const history = demoContractOffers.filter((o) => o.status !== "pending");

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="eyebrow">Contratos con productoras</p>

      {demoContractOffers.length === 0 ? (
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
                <OfferRow key={offer.id} offer={offer} onRespond={respond} />
              ))}
            </div>
          )}

          {history.length > 0 && (
            <>
              <p className="mt-5 text-xs font-semibold text-muted">Historial</p>
              <div className="mt-2 space-y-3">
                {history.map((offer) => (
                  <OfferRow key={offer.id} offer={offer} onRespond={respond} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
