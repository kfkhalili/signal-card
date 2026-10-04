import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("delete-user Edge Function auth contract", () => {
  const config = readFileSync(join(process.cwd(), "supabase/config.toml"), "utf8");
  const source = readFileSync(
    join(process.cwd(), "supabase/functions/delete-user/index.ts"),
    "utf8"
  );

  it("bypasses the legacy gateway verifier for rotated signing keys", () => {
    const functionConfig = config.match(
      /\[functions\.delete-user\][\s\S]*?(?=\n\[functions\.|$)/
    )?.[0];

    expect(functionConfig).toContain("verify_jwt = false");
  });

  it("still requires and verifies the caller's bearer token", () => {
    expect(source).toContain('authHeader?.startsWith("Bearer ")');
    expect(source).toContain("userSupabase.auth.getUser(accessToken)");
    expect(source).toContain('{ error: "Unauthorized access" }, 401');
  });
});
