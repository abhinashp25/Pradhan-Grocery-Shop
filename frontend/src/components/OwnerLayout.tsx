import { Link, NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/owner", label: "Home", end: true },
  { to: "/owner/lists", label: "Lists" },
  { to: "/owner/credit", label: "Credit" },
  { to: "/owner/products", label: "Products" },
  { to: "/owner/more", label: "More" },
];

export function OwnerLayout() {
  return (
    <>
      <header className="no-print sticky top-0 z-20 bg-[#3A2A1E] text-[#FFF8EC]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/owner" className="font-display text-xl font-extrabold">Pradhan Grocery Store</Link>
          <span className="rounded-full bg-saffron px-3 py-1 text-sm font-bold text-[#3A2A1E]">OWNER</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4"><Outlet /></main>
      <nav aria-label="Owner" className="no-print fixed inset-x-0 bottom-0 z-20 flex h-[72px] border-t border-line bg-card">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}
            className={({ isActive }) => `flex flex-1 items-center justify-center text-sm font-bold ${isActive ? "bg-[#FFE9C7] text-saffron-dark" : "text-ink"}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
