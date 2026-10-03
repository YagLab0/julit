// Validation for the certify form. The certificate constraints mirror the
// audit-certificates Storage bucket (docs/database.md): application/pdf only,
// 50 MiB maximum. ESG approval and the EU assessment are auditor declarations
// at certification — negative findings are valid payloads (ADR-0004/0006).
import type { EuAssessment } from "./batches";

export const CERTIFICATE_MAX_BYTES = 50 * 1024 * 1024;

export type CertifyFormValues = {
  /** MIME type of the selected file; null when none is selected. */
  fileType: string | null;
  /** Size in bytes of the selected file; null when none is selected. */
  fileSizeBytes: number | null;
  /** Lowercase-hex SHA-256 of the file, computed locally; null until computed. */
  digest: string | null;
  esgApproved: boolean | null;
  euAssessment: EuAssessment | null;
};

export type CertifyFieldKey = "certificate" | "esgApproved" | "euAssessment";

export type CertifyFieldErrors = Partial<Record<CertifyFieldKey, string>>;

/** Exact payload for a future certify_batch instruction + certificate upload. */
export type CertifyPayload = {
  digest: string;
  esgApproved: boolean;
  euAssessment: EuAssessment;
};

const SHA256_RE = /^[0-9a-f]{64}$/;

export function validateCertifyForm(values: CertifyFormValues): {
  errors: CertifyFieldErrors;
  payload: CertifyPayload | null;
} {
  const errors: CertifyFieldErrors = {};

  if (values.fileType === null || values.fileSizeBytes === null) {
    errors.certificate = "Seleccioná el certificado de auditoría (PDF).";
  } else if (values.fileType !== "application/pdf") {
    errors.certificate = "El certificado debe ser un PDF.";
  } else if (values.fileSizeBytes > CERTIFICATE_MAX_BYTES) {
    errors.certificate = "El certificado supera el máximo de 50 MiB.";
  } else if (!values.digest || !SHA256_RE.test(values.digest)) {
    errors.certificate = "No se pudo calcular el digest del archivo.";
  }

  if (values.esgApproved === null) {
    errors.esgApproved = "Declará el resultado de la certificación ESG.";
  }

  if (values.euAssessment === null) {
    errors.euAssessment =
      "Declará la evaluación de la regulación europea de baterías.";
  }

  const payload =
    Object.keys(errors).length === 0
      ? {
          digest: values.digest!,
          esgApproved: values.esgApproved!,
          euAssessment: values.euAssessment!,
        }
      : null;

  return { errors, payload };
}
