import { readFileSync } from "node:fs";
import path from "node:path";

describe("email confirmation routing contract", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/auth/confirm/route.ts"),
    "utf8"
  );

  it("verifies the token and routes success to profile completion", () => {
    expect(source).toContain("supabase.auth.verifyOtp");
    expect(source).toContain(
      "new URL('/auth/complete-profile', request.url)"
    );
  });

  it("routes invalid confirmation links to the auth error page", () => {
    expect(source).toContain("redirectUrl.pathname = '/auth/auth-error'");
    expect(source).toContain("'Invalid token or link expired.'");
  });
});
