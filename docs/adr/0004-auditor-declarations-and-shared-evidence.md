# Auditor declarations share one public audit certificate

**Status:** superseded by [ADR-0016](./0016-plant-level-certification.md) — per-batch auditing was replaced by plant-level certification declared by the producer.

The batch's existing audit certificate supports both ESG certification and the designated auditor's EU Battery Regulation evaluation, rather than adding independent external certification documents. These are attributed declarations by the designated auditor, not automatic or official legal compliance certifications. The PDF is publicly downloadable, and its SHA-256 proves document integrity against the on-chain digest without proving the truth of its contents. The certificate must identify the requirements evaluated under Regulation (EU) 2023/1542 and the basis for its conclusions.

The `Audited` state records that the designated auditor completed the evaluation, including negative findings. It does not by itself assert ESG approval or a conformant EU Battery Regulation evaluation.

Any audited batch is eligible for simulated purchase even when ESG approval or the EU evaluation is negative. The public passport and catalogue must display those findings explicitly. Reserved batches still restrict purchase to their designated buyer.
