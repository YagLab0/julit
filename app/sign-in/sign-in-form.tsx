"use client";

// Sign-up removed: accounts are provisioned, not self-registered.
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { inputClass, labelClass } from "../components/form-styles";
import type { AccountDict } from "../account/i18n";

type SignInDict = AccountDict["signIn"];

export function SignInForm({ dict }: { dict: SignInDict }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? dict.badCredentials
          : signInError.message === "Email not confirmed"
            ? dict.confirmEmail
            : dict.genericError
      );
      setBusy(false);
      return;
    }

    router.push("/account");
    router.refresh();
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
          {dict.password}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? dict.submitting : dict.submit}
      </button>
      {/* Sign-up removed: accounts are provisioned, not self-registered.
      <p className="text-center text-xs text-muted">
        ¿No tenés cuenta?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-brand-700"
        >
          Creá la de tu empresa
        </Link>
      </p>
      */}
    </form>
  );
}
