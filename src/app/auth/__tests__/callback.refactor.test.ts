import { readFileSync } from "node:fs";
import path from "node:path";

describe("auth callback routing contract", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/auth/callback/route.ts"),
    "utf8"
  );

  it("exchanges the code and preserves an explicit next destination", () => {
    expect(source).toContain("supabase.auth.exchangeCodeForSession(code)");
    expect(source).toContain(
      'requestUrl.searchParams.get("next") ?? "/"'
    );
    expect(source).toContain("NextResponse.redirect(`${origin}${next}`)");
  });

  it("defaults failed callbacks to the auth error page", () => {
    expect(source).toContain(
      "NextResponse.redirect(`${origin}/auth/auth-error`)"
    );
  });
});
