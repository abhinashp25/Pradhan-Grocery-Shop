// Page-shaped loading screens. They look like the page that is coming, so slow net feels calm.
import { useEffect, useState } from "react";
import { useText } from "../lib/lang";
import { Skeleton } from "./Skeleton";

// After a few seconds with no answer, tell the person to wait. No scary error yet.
function SlowHint() {
  const t = useText();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 7000);
    return () => window.clearTimeout(timer);
  }, []);
  return slow ? <p role="status" className="text-center font-bold text-muted">{t("slowNet")}</p> : null;
}

export function HeroSkeleton() {
  return <Skeleton className="h-64 w-full rounded-[2rem] lg:h-96" />;
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-line/40">
          <Skeleton className="aspect-[3/2] w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true">
      <HeroSkeleton />
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-44 md:col-span-3 lg:col-span-2 lg:row-span-2 lg:h-80" />
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}
      </div>
      <CardGridSkeleton count={4} />
      <SlowHint />
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <HeroSkeleton />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 w-28 flex-none rounded-full" />)}
      </div>
      <CardGridSkeleton />
      <SlowHint />
    </div>
  );
}

// For any other page: a title and a few blocks.
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <SlowHint />
    </div>
  );
}
