import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";

/**
 * Unknown or malformed PDA: an explicit dead end with the way back to the
 * catalogue, never a fabricated record.
 */
export default function PassportNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-4">
        <Link href="/explorer" className="text-sm font-bold tracking-tight">
          JuLit
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="eyebrow">Pasaporte de lote</p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            Pasaporte no encontrado
          </h1>
          <p className="mt-2 text-sm text-muted">
            No hay ningún lote indexado con esta dirección.
          </p>
          <Link href="/explorer" className="btn-secondary mt-5 inline-block">
            Ver el catálogo
          </Link>
        </div>
      </main>
    </div>
  );
}
