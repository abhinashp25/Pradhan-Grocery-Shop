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
  const { profile, ready } = useAuth();
  if (!ready) return <Skeleton className="h-40" />;
  return profile?.role === "admin" ? <>{children}</> : <Navigate to="/owner/login" replace />;
}
