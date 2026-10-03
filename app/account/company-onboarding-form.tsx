"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CompanyFields } from "../components/company-fields";
import type { CompanyType } from "../lib/company";
import { ORIGINS } from "../lib/origins";

export function CompanyOnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType>("producer");
  const [originId, setOriginId] = useState<string>(ORIGINS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        company_type: companyType,
        origin_id: companyType === "producer" ? originId : null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        payload?.error ?? "No se pudo registrar la empresa. Intentá de nuevo."
      );
      setBusy(false);
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold tracking-tight">
        Completá el perfil de tu empresa
      </h1>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Tu cuenta todavía no tiene una empresa registrada. El tipo queda fijo
        cuando vincules la wallet.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <CompanyFields
          name={name}
          onNameChange={setName}
          companyType={companyType}
          onCompanyTypeChange={setCompanyType}
          originId={originId}
          onOriginIdChange={setOriginId}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Registrando…" : "Registrar empresa"}
        </button>
      </form>
    </section>
  );
}
