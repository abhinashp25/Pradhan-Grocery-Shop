// Small helpers that every function uses.

export const corsHeaders = {
  // Set ALLOWED_ORIGIN to your real site address (for example https://pradhan.pages.dev).
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
