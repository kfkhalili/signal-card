// supabase/functions/_shared/auth.ts

import { verifyAuth } from "npm:@supabase/server@1.4.1/core";

/**
 * The Supabase API key name provisioned for trusted database jobs and workers.
 * Requests must send this key's value in the `apikey` header.
 */
export const INTERNAL_API_KEY_NAME = "edge_functions_internal";

const INTERNAL_AUTH_MODE = `secret:${INTERNAL_API_KEY_NAME}` as const;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Restricts an Edge Function to the named internal Supabase secret key.
 *
 * `verify_jwt` must be false for functions using this guard because opaque
 * `sb_secret_...` API keys belong in `apikey`, not in `Authorization`.
 */
export async function ensureInternalAuth(
  req: Request,
): Promise<Response | null> {
  const { error } = await verifyAuth(req, { auth: INTERNAL_AUTH_MODE });

  if (!error) {
    return null;
  }

  console.warn("[edge-function-auth] Internal request rejected", {
    code: error.code,
    status: error.status,
  });

  return new Response(JSON.stringify({ message: "Unauthorized" }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    status: error.status,
  });
}
