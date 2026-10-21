import { Route, Routes } from "react-router-dom";
import { OwnerLayout } from "./components/OwnerLayout";
import { RequireOwner } from "./components/Guards";
import { Backup } from "./pages/owner/Backup";
import { CreditList } from "./pages/owner/CreditList";
import { CustomerCredit } from "./pages/owner/CustomerCredit";
import { Customers } from "./pages/owner/Customers";
import { Dashboard } from "./pages/owner/Dashboard";
import { Log } from "./pages/owner/Log";
import { OwnerLogin } from "./pages/owner/Login";
import { More } from "./pages/owner/More";
import { ProductEdit } from "./pages/owner/ProductEdit";
import { Products } from "./pages/owner/Products";
import { Rates } from "./pages/owner/Rates";
import { SentLists } from "./pages/owner/SentLists";
import { Settings } from "./pages/owner/Settings";
import { TwoStep } from "./pages/owner/TwoStep";
import { Upload } from "./pages/owner/Upload";
import { NotFound } from "./pages/NotFound";

// Everything under /owner. The owner screens have their own header and bottom bar.
export default function OwnerApp() {
  return (
    <Routes>
      <Route path="login" element={<OwnerLogin />} />
      <Route element={<RequireOwner><OwnerLayout /></RequireOwner>}>
        <Route index element={<Dashboard />} />
        <Route path="lists" element={<SentLists />} />
        <Route path="credit" element={<CreditList />} />
        <Route path="credit/:accountId" element={<CustomerCredit />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductEdit />} />
        <Route path="products/:id" element={<ProductEdit />} />
        <Route path="rates" element={<Rates />} />
        <Route path="upload" element={<Upload />} />
        <Route path="settings" element={<Settings />} />
        <Route path="backup" element={<Backup />} />
        <Route path="log" element={<Log />} />
        <Route path="more" element={<More />} />
        <Route path="two-step" element={<TwoStep />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
