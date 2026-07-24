import { ensureInternalAuth, INTERNAL_API_KEY_NAME } from "./auth.ts";

const INTERNAL_KEY = "sb_secret_internal_test_key";

async function withInternalKeyEnvironment(
  run: () => Promise<void>,
): Promise<void> {
  const previousUrl = Deno.env.get("SUPABASE_URL");
  const previousSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set(
    "SUPABASE_SECRET_KEYS",
    JSON.stringify({ [INTERNAL_API_KEY_NAME]: INTERNAL_KEY }),
  );

  try {
    await run();
  } finally {
    if (previousUrl === undefined) {
      Deno.env.delete("SUPABASE_URL");
    } else {
      Deno.env.set("SUPABASE_URL", previousUrl);
    }

    if (previousSecretKeys === undefined) {
      Deno.env.delete("SUPABASE_SECRET_KEYS");
    } else {
      Deno.env.set("SUPABASE_SECRET_KEYS", previousSecretKeys);
    }
  }
}

Deno.test({
  name: "ensureInternalAuth accepts the specifically named secret key",
  permissions: { env: true },
  async fn() {
    await withInternalKeyEnvironment(async () => {
      const request = new Request("https://example.com", {
        headers: { apikey: INTERNAL_KEY },
      });

      const response = await ensureInternalAuth(request);

      if (response !== null) {
        throw new Error(`Expected auth success, received ${response.status}`);
      }
    });
  },
});

Deno.test({
  name: "ensureInternalAuth rejects a missing API key",
  permissions: { env: true },
  async fn() {
    await withInternalKeyEnvironment(async () => {
      const response = await ensureInternalAuth(
        new Request("https://example.com"),
      );

      if (response?.status !== 401) {
        throw new Error(`Expected 401, received ${response?.status}`);
      }
    });
  },
});

Deno.test({
  name: "ensureInternalAuth rejects other project secret keys",
  permissions: { env: true },
  async fn() {
    await withInternalKeyEnvironment(async () => {
      Deno.env.set(
        "SUPABASE_SECRET_KEYS",
        JSON.stringify({
          [INTERNAL_API_KEY_NAME]: INTERNAL_KEY,
          default: "sb_secret_default_test_key",
        }),
      );

      const request = new Request("https://example.com", {
        headers: { apikey: "sb_secret_default_test_key" },
      });
      const response = await ensureInternalAuth(request);

      if (response?.status !== 401) {
        throw new Error(`Expected 401, received ${response?.status}`);
      }
    });
  },
});

Deno.test({
  name: "ensureInternalAuth rejects legacy bearer-key authentication",
  permissions: { env: true },
  async fn() {
    await withInternalKeyEnvironment(async () => {
      const request = new Request("https://example.com", {
        headers: { Authorization: `Bearer ${INTERNAL_KEY}` },
      });
      const response = await ensureInternalAuth(request);

      if (response?.status !== 401) {
        throw new Error(`Expected 401, received ${response?.status}`);
      }
    });
  },
});
