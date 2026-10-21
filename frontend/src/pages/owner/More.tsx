import { Link, useNavigate } from "react-router-dom";
import { plainButton } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

const links = [
  ["/owner/customers", "Customers"],
  ["/owner/rates", "Today's Rates"],
  ["/owner/upload", "Bulk upload"],
  ["/owner/settings", "Shop settings and banner"],
  ["/owner/backup", "Backup and export"],
  ["/owner/log", "Activity log"],
  ["/owner/two-step", "Two-step code"],
  ["/", "View the shop as a customer"],
];

export function More() {
  const go = useNavigate();
  useTitle("More");
  async function logout() {
    await supabase.auth.signOut();
    go("/owner/login", { replace: true });
  }
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl font-extrabold">More</h1>
      {links.map(([to, label]) => <Link key={to} to={to} className={`${plainButton} w-full justify-between`}>{label} <span>›</span></Link>)}
      <button className={`${plainButton} w-full`} onClick={logout}>Logout</button>
    </div>
  );
}
