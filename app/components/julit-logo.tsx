/** JuLit brand mark — same art as app/icon.svg (teal tile + hex J). */
export function JuLitMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-brand-700 dark:fill-brand-500"
      />
      <path
        d="M16 4 26 10v12l-10 6-10-6V10Z"
        strokeWidth="1.4"
        className="stroke-white"
      />
      <path
        d="M20 10v9a4 4 0 0 1-8 0"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-white"
      />
    </svg>
  );
}
