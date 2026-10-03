import type { DemoBatch } from "./demo-data";

export const numberFmt = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 6,
});
export const percentFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function Findings({ batch }: { batch: DemoBatch }) {
  return (
    <div className="mt-3 space-y-2 border-t border-border-low pt-3">
      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            batch.esgApproved
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          ESG {batch.esgApproved ? "aprobado" : "no aprobado"}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            batch.euAssessment === "conformant"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          UE 2023/1542{" "}
          {batch.euAssessment === "conformant" ? "conforme" : "no conforme"}
        </span>
      </div>
      {batch.auditSha256 && (
        <p className="text-[11px] text-muted">
          Certificado SHA-256:{" "}
          <span className="font-mono break-all">{batch.auditSha256}</span>
        </p>
      )}
    </div>
  );
}
