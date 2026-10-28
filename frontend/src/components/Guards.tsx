import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Skeleton } from "./Skeleton";

export function RequireCustomer({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <Skeleton className="h-40" />;
  return session ? <>{children}</> : <Navigate to="/login" replace />;
}

export function RequireOwner({ children }: { children: ReactNode }) {
  const { profile, ready, needsCode } = useAuth();
  if (!ready) return <Skeleton className="h-40" />;
  // The owner must have passed the two-step code too, or the database will refuse every request.
  return profile?.role === "admin" && !needsCode ? <>{children}</> : <Navigate to="/owner/login" replace />;
}
