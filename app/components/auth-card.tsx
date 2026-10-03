import Link from "next/link";
import type { PropsWithChildren } from "react";

type AuthCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-foreground"
        >
          JuLit
        </Link>
        <div className="mt-4 rounded-2xl border border-border-low bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {subtitle}
            </p>
          )}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </main>
  );
}
