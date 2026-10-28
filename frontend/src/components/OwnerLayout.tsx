import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BackButton } from "./BackButton";
import { supabase } from "../lib/supabase";

// Phone: five tabs at the bottom. Laptop: a side menu with every owner screen.
const tabs = [
  { to: "/owner", label: "Home", end: true },
  { to: "/owner/lists", label: "Lists" },
  { to: "/owner/credit", label: "Credit" },
  { to: "/owner/products", label: "Products" },
  { to: "/owner/more", label: "More" },
];

const side = [
  { to: "/owner", label: "Dashboard", end: true },
  { to: "/owner/lists", label: "Sent Lists" },
  { to: "/owner/credit", label: "Credit Book" },
  { to: "/owner/customers", label: "Customers" },
  { to: "/owner/products", label: "Products" },
  { to: "/owner/rates", label: "Today's Rates" },
  { to: "/owner/upload", label: "Bulk upload" },
  { to: "/owner/settings", label: "Shop settings" },
  { to: "/owner/backup", label: "Backup and export" },
  { to: "/owner/log", label: "Activity log" },
  { to: "/owner/two-step", label: "Two-step code" },
];

export function OwnerLayout() {
  const go = useNavigate();
  const { pathname } = useLocation();
  async function logout() {
    await supabase.auth.signOut();
    go("/owner/login", { replace: true });
  }
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden w-64 flex-none flex-col bg-[#3A2A1E] p-4 text-[#FFF8EC] lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        <Link to="/owner" className="mb-1 font-display text-2xl font-extrabold">Pradhan Grocery Store</Link>
        <span className="mb-6 w-fit rounded-full bg-saffron px-3 py-1 text-sm font-bold text-[#3A2A1E]">OWNER</span>
        <nav aria-label="Owner" className="flex-1 space-y-1">
          {side.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `block rounded-xl px-3 py-3 font-bold ${isActive ? "bg-saffron text-[#3A2A1E]" : "hover:bg-[#FFF8EC]/15"}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="mt-4 block rounded-xl px-3 py-3 font-bold hover:bg-[#FFF8EC]/15">View the shop</Link>
        <button onClick={logout} className="rounded-xl px-3 py-3 text-left font-bold hover:bg-[#FFF8EC]/15">Logout</button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-20 bg-[#3A2A1E] text-[#FFF8EC] lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/owner" className="font-display text-xl font-extrabold">Pradhan Grocery Store</Link>
            <span className="rounded-full bg-saffron px-3 py-1 text-sm font-bold text-[#3A2A1E]">OWNER</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 lg:px-10 lg:pb-12 lg:pt-8">
          {pathname !== "/owner" && <div className="mb-4"><BackButton fallback="/owner" label="Back" /></div>}
          <Outlet />
        </main>
      </div>

      <nav aria-label="Owner tabs" className="no-print fixed inset-x-0 bottom-0 z-20 flex h-[72px] border-t border-line bg-card lg:hidden">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}
            className={({ isActive }) => `flex flex-1 items-center justify-center text-sm font-bold ${isActive ? "bg-[#FFE9C7] text-saffron-dark" : "text-ink"}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
