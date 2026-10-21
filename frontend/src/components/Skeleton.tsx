// Grey shapes the same size as the real content while it loads.
export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line/50 ${className}`} aria-hidden="true" />;
}
