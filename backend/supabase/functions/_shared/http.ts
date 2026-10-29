// Small helpers that every function uses.

// ALLOWED_ORIGIN must be set in Supabase Edge Function environment variables
// to your real site (e.g. https://pradhan.pages.dev).
// If missing we fall back to the same origin only (no CORS), which is safe
// but will break requests from the browser. Set the env var before deploying.
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "";

export const corsHeaders = {
  // Only send the header when the origin is explicitly configured.
  // An empty string means "same origin only" — safe default.
  ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Tighten: do not allow credentials to flow to wildcard origins.
  "Access-Control-Allow-Credentials": allowedOrigin ? "true" : "false",
};

export function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Wraps a handler so that ANY crash still answers with a short JSON message and the CORS header.
// Without this, a crash shows up in the browser as a confusing "blocked by CORS policy" error.
export function safely(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return preflight();
    try {
      return await handler(req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Function crashed:", message);
      const reason = message.includes("PIN_PEPPER") ? "pepper_missing" : "crashed";
      return reply({ code: "server_error", reason }, 500);
    }
  };
}