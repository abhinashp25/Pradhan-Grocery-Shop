// Every database read the customer screens need.
import { supabase } from "./supabase";
import type { Category, Product, Shop } from "./types";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data as Category[];
}

export async function fetchProducts(categorySlug: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_sizes(*), categories!inner(slug)")
    .eq("categories.slug", categorySlug)
    .order("is_available", { ascending: false })
    .order("is_popular", { ascending: false })
    .order("name_en");
  if (error) throw error;
  return data as unknown as Product[];
}

export function photoUrl(path: string): string {
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}

export function bannerUrl(path: string): string {
  return supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
}

export type ShopPhoto = { id: number; storage_path: string; caption_en: string | null; sort_order: number };

export async function fetchShopPhotos(): Promise<ShopPhoto[]> {
  const { data, error } = await supabase
    .from("shop_photos")
    .select("id,storage_path,caption_en,sort_order")
    .order("sort_order")
    .order("id");
  if (error) throw error;
  return (data ?? []) as ShopPhoto[];
}

export async function fetchShop(): Promise<Shop> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("name,address,phone,whatsapp,timings,map_link")
    .single();
  if (error) throw error;
  return data as Shop;
}

// Search returns products only, so the sizes and prices are fetched in a second step.
export async function searchProducts(term: string): Promise<Product[]> {
  const { data, error } = await supabase.rpc("search_products", { q: term });
  if (error) throw error;
  const found = (data ?? []) as Omit<Product, "product_sizes">[];
  if (found.length === 0) return [];
  const { data: sizes, error: sizeError } = await supabase
    .from("product_sizes")
    .select("*")
    .in("product_id", found.map((product) => product.id));
  if (sizeError) throw sizeError;
  return found.map((product) => ({
    ...product,
    product_sizes: (sizes ?? []).filter((size) => (size as { product_id: string }).product_id === product.id),
  })) as Product[];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*, product_sizes(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchServices() {
  const { data, error } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data as { id: number; name_en: string; name_or: string; price_paise: number | null; unit_label: string | null; price_note: string | null }[];
}

export type Banner = { text_or: string | null; text_en: string | null; text_hi: string | null };

export async function fetchBanner(): Promise<Banner | null> {
  const { data, error } = await supabase.from("banners").select("text_or,text_en,text_hi").eq("show_on", "home").eq("is_active", true).limit(1).maybeSingle();
  if (error) throw error;
  return data as Banner | null;
}

// A few products from one or more categories, for the rows on Home.
export async function fetchHighlights(slugs: string[], popularOnly: boolean): Promise<Product[]> {
  let query = supabase.from("products").select("*, product_sizes(*), categories!inner(slug)").in("categories.slug", slugs).eq("is_hidden", false).eq("is_available", true).limit(4);
  if (popularOnly) query = query.eq("is_popular", true);
  const { data, error } = await query.order("name_en");
  if (error) throw error;
  return data as unknown as Product[];
}

export async function fetchSubgroups(categorySlug: string) {
  const { data, error } = await supabase.from("subcategories").select("id,name_en,name_or,name_hi,categories!inner(slug)").eq("categories.slug", categorySlug).eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data as unknown as { id: number; name_en: string; name_or: string; name_hi: string | null }[];
}
