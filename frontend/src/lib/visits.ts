import { supabase } from "./supabase";

// A QR code link like /?utm_source=bag&utm_medium=qr adds 1 to a daily count.
// No names, phone numbers or device ids are sent.
export function logVisit() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  if (!source) return;
  try {
    if (sessionStorage.getItem("visit-logged")) return;
    sessionStorage.setItem("visit-logged", "1");
  } catch {
    // Without session storage we may count twice. That is acceptable.
  }
  void supabase.rpc("log_visit", { p_source: source, p_medium: params.get("utm_medium") ?? "" });
}
