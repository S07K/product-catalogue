/** Neutral shimmering placeholder. Decorative: wrap groups in a role="status" region with a label. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`shimmer bg-surface-muted ${className}`} />;
}
