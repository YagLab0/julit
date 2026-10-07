import Link from "next/link";

export function GateCard({
  body,
  href = "/account",
  linkLabel = "Ir a mi cuenta",
}: {
  body: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mt-8 rounded-3xl bg-card p-8 text-center">
      <p className="text-sm text-muted">{body}</p>
      <Link
        href={href}
        className="btn-secondary mt-4 inline-block rounded-full px-4"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
