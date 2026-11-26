/**
 * Placeholder brand mark (until the creative work lands): a shopping bag on the
 * brand colour, with a plate-coloured tag. Colours come from theme tokens via
 * CSS variables, so a rebrand recolours it automatically. Decorative: the
 * adjacent wordmark is the accessible name.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" className={className}>
      <rect width="36" height="36" rx="10" fill="var(--color-brand)" />
      <path
        d="M10.5 14h15l-1.4 12.2a2 2 0 0 1-2 1.8h-8.2a2 2 0 0 1-2-1.8z"
        fill="var(--color-brand-contrast)"
      />
      <path
        d="M14 14v-1.5a4 4 0 0 1 8 0V14"
        fill="none"
        stroke="var(--color-brand-contrast)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="20.5" r="2.6" fill="var(--color-plate-4)" />
    </svg>
  );
}
