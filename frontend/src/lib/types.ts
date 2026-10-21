export type Category = {
  id: number;
  slug: string;
  name_en: string;
  name_or: string;
  name_hi: string | null;
  tint_hex: string;
  icon_key: string;
  sort_order: number;
};

export type ProductSize = {
  id: string;
  label: string;
  price_paise: number;
  sort_order: number;
  is_default: boolean;
};

export type Product = {
  id: string;
  name_en: string;
  name_or: string;
  name_hi: string | null;
  subcategory_id: number | null;
  photo_path: string | null;
  shelf_spot: string | null;
  is_available: boolean;
  is_popular: boolean;
  price_is_approx: boolean;
  price_updated_at: string;
  product_sizes: ProductSize[];
};

export type Shop = {
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  timings: string | null;
  map_link: string | null;
};

export type CreditEntry = {
  id: string;
  entry_type: "credit" | "payment" | "correction";
  effect: 1 | -1;
  amount_paise: number;
  note: string | null;
  reason: string | null;
  entry_date: string;
  created_at: string;
};

export type SentList = {
  id: string;
  sender_name: string;
  sender_phone: string;
  status: "new" | "ready" | "collected" | "replaced";
  estimated_total_paise: number;
  sent_at: string;
  sent_list_items: { id: string; product_name_en: string; product_name_or: string; size_label: string; quantity: number; product_id: string | null }[];
};
