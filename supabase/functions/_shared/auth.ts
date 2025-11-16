// supabase/functions/_shared/auth.ts

/**
 * These headers are now shared, so any function can use them.
 */
export const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
  
  /**
   * Checks for a valid Bearer token in the Authorization header.
   * This is designed to be used as a "gate" at the start of a function.
   *
   * @returns {null} - If authentication is successful.
   * @returns {Response} - If authentication fails, it returns a 401/500 Response object.
   */
  export function ensureCronAuth(req: Request): Response | null {
    // 1. Get the correct key from environment secrets
    const correctKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    // 2. Get the submitted key from the request header
    const authHeader = req.headers.get("Authorization");
  
    // 3. Check if the server has the key configured
    if (!correctKey) {
      console.error("CRITICAL: SUPABASE_ANON_KEY is not set in function secrets.");
      return new Response(JSON.stringify({ message: "Auth system not configured" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500
      });
    }
  
    // 4. Check if the client sent a key
    if (!authHeader) {
      return new Response(JSON.stringify({ message: "Authorization header missing" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 401
      });
    }
  
    // 5. Check if the format is correct (Bearer)
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "Invalid Authorization header format" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 401
      });
    }
  
    // 6. Check if the keys match
    const submittedKey = authHeader.split(" ")[1];
    if (submittedKey !== correctKey) {
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 401
      });
    }
  
    // --- ✅ Auth Check Passed ---
    return null;
  }