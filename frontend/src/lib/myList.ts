// My List lives on the phone. It still works with no internet.
import { useSyncExternalStore } from "react";

export type ListItem = {
  sizeId: string;
  productId: string;
  nameEn: string;
  nameOr: string;
  sizeLabel: string;
  pricePaise: number;
  qty: number;
};

const KEY = "my-list";
const listeners = new Set<() => void>();
let items: ListItem[] = load();

function load(): ListItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ListItem[]) : [];
  } catch {
    return [];
  }
}

function change(next: ListItem[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // If the phone blocks saving, the list still works until the page closes.
  }
  listeners.forEach((notify) => notify());
}

export function addToList(item: Omit<ListItem, "qty">) {
  const found = items.find((entry) => entry.sizeId === item.sizeId);
  if (found) return setQuantity(item.sizeId, found.qty + 1);
  change([...items, { ...item, qty: 1 }]);
}

export function setQuantity(sizeId: string, qty: number) {
  if (qty < 1) return change(items.filter((entry) => entry.sizeId !== sizeId));
  change(items.map((entry) => (entry.sizeId === sizeId ? { ...entry, qty: Math.min(qty, 99) } : entry)));
}

export function clearList() {
  change([]);
}

export function useMyList(): ListItem[] {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => items,
  );
}
