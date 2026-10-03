import fs from "node:fs";
import path from "node:path";

describe("profile image licensing boundary", () => {
  const routeSource = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/images/[...path]/route.ts"),
    "utf8"
  );

  it("requires an authenticated user before reading provider-backed images", () => {
    expect(routeSource).toContain("createSupabaseServerClient");
    expect(routeSource).toContain("supabase.auth.getUser()");
    expect(routeSource).toContain('new Response("Unauthorized"');
    expect(routeSource).toContain("status: 401");
  });

  it("does not permit shared public caching", () => {
    expect(routeSource).toContain('"private, max-age=86400"');
    expect(routeSource).not.toContain('"public, max-age=31536000');
  });
});
