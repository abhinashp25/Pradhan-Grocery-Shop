import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import CustomerApp from "./CustomerApp";
import { Skeleton } from "./components/Skeleton";

// Customers never download the owner screens.
const OwnerApp = lazy(() => import("./OwnerApp"));

export default function App() {
  return (
    <Routes>
      <Route path="/owner/*" element={<Suspense fallback={<Skeleton className="m-4 h-64" />}><OwnerApp /></Suspense>} />
      <Route path="*" element={<CustomerApp />} />
    </Routes>
  );
}
