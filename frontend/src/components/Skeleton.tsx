// A grey shape with a moving light, the same size as the real content.
export function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton ${className.includes("rounded") ? "" : "rounded-2xl"} ${className}`} aria-hidden="true" />;
}
