"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CompanyFields } from "../components/company-fields";
import type { CompanyType } from "../lib/company";

export function CompanyOnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company_type: companyType }),
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
    <section className="rounded-3xl bg-card p-8">
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
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full rounded-full py-2.5"
        >
          {busy ? "Registrando…" : "Registrar empresa"}
        </button>
      </form>
    </section>
  );
}
