// Saving a list to the customer's account, so it is there on any phone.
import type { ListItem } from "./myList";
import { supabase } from "./supabase";

export async function saveCurrentList(customerId: string, items: ListItem[]): Promise<boolean> {
  const title = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const { data, error } = await supabase.from("shopping_lists").insert({ customer_id: customerId, title }).select("id").single();
  if (error || !data) return false;
  const { error: itemError } = await supabase
    .from("shopping_list_items")
    .insert(items.map((item) => ({ list_id: data.id, product_size_id: item.sizeId, quantity: item.qty })));
  return !itemError;
}
