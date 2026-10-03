import { BigBag } from "./big-bag";
import { ProcessWidgetMotion } from "./process-widget-motion";
import styles from "./process-widgets.module.css";

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5M10 16h5" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
    </svg>
  );
}

export function ProcessWidget({ stage }: { stage: number }) {
  return (
    <ProcessWidgetMotion className={styles.widget} decorative>
      <div className={styles.grid} />
      <span className={styles.overline}>
        {stage === 0
          ? "El producto"
          : stage === 1
            ? "La evidencia"
            : "La decisión"}
      </span>
      {stage === 0 ? (
        <>
          <BigBag />
          <div className={styles.batchTag}>
            <span className={styles.tagDot} /> Carbonato de litio
          </div>
          <div className={styles.fields}>
            {["Origen", "Cantidad", "Pureza"].map((field) => (
              <span key={field}>{field}</span>
            ))}
          </div>
        </>
      ) : stage === 1 ? (
        <>
          <div className={styles.reportBack} />
          <div className={styles.report}>
            <div className={styles.documentHeader}>
              <span className={styles.documentIcon}>
                <DocumentIcon />
              </span>
              <span>
                Informe del auditor<small>Evidencia del lote</small>
              </span>
            </div>
            <div className={styles.reportRule} />
            <div className={styles.reportRow} data-process-write>
              <span>Datos químicos</span>
              <i />
            </div>
            <div className={styles.reportRow} data-process-write>
              <span>Evaluación ambiental</span>
              <i />
            </div>
            <div className={styles.reportLines}>
              <i data-process-write />
              <i data-process-write />
              <i data-process-write />
            </div>
            <div className={styles.integrity} data-process-write>
              <LinkIcon />
              <span>Referencia de integridad</span>
            </div>
          </div>
          <span className={styles.connection} />
          <div className={styles.linkedBatch}>
            <LinkIcon /> Lote + informe
          </div>
        </>
      ) : (
        <>
          <div className={styles.passport} data-process-float>
            <div className={styles.passportHeader}>
              <span>
                JuLit<span className={styles.passportDot}>●</span>
              </span>
              <span>Pasaporte del lote</span>
            </div>
            <div className={styles.passportTitle}>
              Una vista.
              <br />
              Toda la evidencia.
            </div>
            <div className={styles.passportRows}>
              {[
                "Origen del lote",
                "Condiciones comerciales",
                "Informe del auditor",
              ].map((label, index) => (
                <div key={label}>
                  <span className={styles.rowNumber}>0{index + 1}</span>
                  <span>{label}</span>
                  <span className={styles.rowArrow}>↗</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.reviewTag} data-process-float>
            <DocumentIcon /> Revisar para decidir
          </div>
        </>
      )}
    </ProcessWidgetMotion>
  );
}
