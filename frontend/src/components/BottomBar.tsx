import { NavLink } from "react-router-dom";
import { Icon } from "./icons";
import { useMyList } from "../lib/myList";
import { useText } from "../lib/lang";

export function BottomBar() {
  const t = useText();
  const count = useMyList().length;
  const items = [
    { to: "/", icon: "home", label: t("home") },
    { to: "/search", icon: "search", label: t("search") },
    { to: "/list", icon: "list", label: count ? `${t("myList")} (${count})` : t("myList") },
    { to: "/account", icon: "person", label: t("account") },
  ];
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-20 flex h-[72px] border-t border-line bg-card lg:hidden"
    >
      {items.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 text-[13px] font-bold ${
              isActive ? "bg-[#FFE9C7] text-saffron-dark" : "text-ink hover:bg-saffron/20"
            }`
          }
        >
          <Icon name={icon} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
