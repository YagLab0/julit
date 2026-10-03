"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { CompanyFields } from "../components/company-fields";
import { inputClass, labelClass } from "../components/form-styles";
import type { CompanyType } from "../lib/company";
import { ORIGINS } from "../lib/origins";
import { createClient } from "../lib/supabase/client";

export function SignUpForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType>("producer");
  const [originId, setOriginId] = useState<string>(ORIGINS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Esa cuenta ya existe. Ingresá con tu contraseña."
          : signUpError.message.startsWith("Password should be at least")
            ? "La contraseña debe tener al menos 6 caracteres."
            : "No se pudo crear la cuenta. Intentá de nuevo."
      );
      setBusy(false);
      return;
    }

    if (!data.session) {
      setAwaitingConfirmation(true);
      setBusy(false);
      return;
    }

    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        company_type: companyType,
        origin_id: companyType === "producer" ? originId : null,
      }),
    });

    if (!response.ok && response.status !== 409) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(
        payload?.error ?? "No se pudo registrar la empresa. Intentá de nuevo."
      );
      setBusy(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <div className="space-y-3 text-sm text-foreground">
        <p>
          Te enviamos un correo a <strong>{email}</strong> para confirmar tu
          cuenta.
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Cuando la confirmes, ingresá y completá los datos de tu empresa.
        </p>
        <Link href="/sign-in" className="btn-primary inline-block">
          Ir a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
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
        {busy ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-center text-xs text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-brand-700 dark:text-brand-400"
        >
          Ingresá
        </Link>
      </p>
    </form>
  );
}
