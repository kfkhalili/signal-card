import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

test.describe("unauthenticated acquisition baseline", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const viewport of viewports) {
    test(`${viewport.name} landing and signup entry points`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const main = page.locator("main");
      await expect(
        main.getByRole("heading", { name: "Spot the Trends" })
      ).toBeVisible();
      await expect(
        main.getByText(
          "Synthetic product preview — fictional company and illustrative values, not current market data."
        )
      ).toBeVisible();

      const signup = main.getByRole("link", { name: "Sign up", exact: true });
      await expect(signup).toHaveAttribute("href", "/auth#auth-sign-up");

      await page.goto("/auth#auth-sign-up");
      await expect(
        page.getByRole("button", { name: "Sign in with Google", exact: true })
      ).toBeVisible();
      await expect(page.getByLabel("Email address")).toBeVisible();
      await expect(page.getByLabel("Create a Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeVisible();
    });
  }

  for (const protectedPath of ["/compass", "/symbol", "/workspace"]) {
    test(`${protectedPath} redirects to auth and preserves its pathname`, async ({
      page,
    }) => {
      await page.goto(`${protectedPath}?source=baseline`);

      await expect(page).toHaveURL(/\/auth\?/);
      const redirectedUrl = new URL(page.url());
      expect(redirectedUrl.searchParams.get("next")).toBe(protectedPath);
      expect(redirectedUrl.searchParams.get("message")).toBe(
        "Please log in to access this page."
      );
    });
  }
});
