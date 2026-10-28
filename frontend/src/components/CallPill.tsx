import { Icon } from "./icons";
import { useText } from "../lib/lang";

// Hidden until the shop phone number is known, so the button never goes nowhere.
export function CallPill({ phone }: { phone: string | null }) {
  const t = useText();
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      className="no-print fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-20 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-saffron-light to-saffron px-4 font-bold text-[#3A2A1E] shadow-lg active:translate-y-1"
    >
      <Icon name="phone" size={22} />
      {t("callShop")}
    </a>
  );
}
