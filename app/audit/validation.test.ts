import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_MAX_BYTES,
  validateCertifyForm,
  type CertifyFormValues,
} from "./validation";

const DIGEST = "a".repeat(64);

const VALID: CertifyFormValues = {
  fileType: "application/pdf",
  fileSizeBytes: 1024 * 1024,
  digest: DIGEST,
  esgApproved: true,
  euAssessment: "conformant",
};

function check(overrides: Partial<CertifyFormValues> = {}) {
  return validateCertifyForm({ ...VALID, ...overrides });
}

describe("validateCertifyForm", () => {
  it("accepts the happy path and returns the certification payload", () => {
    const { errors, payload } = check();
    expect(errors).toEqual({});
    expect(payload).toEqual({
      digest: DIGEST,
      esgApproved: true,
      euAssessment: "conformant",
    });
  });

  it("accepts negative findings: ESG false and EU non_conformant", () => {
    const { errors, payload } = check({
      esgApproved: false,
      euAssessment: "non_conformant",
    });
    expect(errors).toEqual({});
    expect(payload).toEqual({
      digest: DIGEST,
      esgApproved: false,
      euAssessment: "non_conformant",
    });
  });

  it("requires a certificate file", () => {
    const { errors } = check({
      fileType: null,
      fileSizeBytes: null,
      digest: null,
    });
    expect(errors.certificate).toBeTruthy();
  });

  it("rejects a non-PDF certificate", () => {
    const { errors } = check({ fileType: "image/png" });
    expect(errors.certificate).toBeTruthy();
  });

  it("rejects a certificate over the 50 MiB bucket limit", () => {
    const { errors } = check({
      fileSizeBytes: CERTIFICATE_MAX_BYTES + 1,
    });
    expect(errors.certificate).toBeTruthy();
  });

  it("accepts a certificate exactly at the limit", () => {
    const { errors } = check({ fileSizeBytes: CERTIFICATE_MAX_BYTES });
    expect(errors.certificate).toBeUndefined();
  });

  it("requires the computed digest once a file is selected", () => {
    const { errors } = check({ digest: null });
    expect(errors.certificate).toBeTruthy();
  });

  it("requires the ESG declaration", () => {
    const { errors } = check({ esgApproved: null });
    expect(errors.esgApproved).toBeTruthy();
  });

  it("requires the EU assessment declaration", () => {
    const { errors } = check({ euAssessment: null });
    expect(errors.euAssessment).toBeTruthy();
  });
});
