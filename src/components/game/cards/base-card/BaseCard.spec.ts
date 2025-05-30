// tests/components/BaseCard.spec.ts
import { test, expect, type Page } from "@playwright/test";

const STORYBOOK_URL = process.env.STORYBOOK_URL || "http://localhost:6006";

const getVisibleFrontFace = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[role="button"][aria-label="Show STCK back details"][aria-pressed="false"][aria-hidden="false"]'
  );
};

const getVisibleBackFace = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[role="button"][aria-label="Show STCK front details"][aria-pressed="false"][aria-hidden="false"]'
  );
};

const getHiddenFrontFace = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[role="button"][aria-label="Show STCK front details"][aria-pressed="true"][aria-hidden="true"]'
  );
};

const getHiddenBackFace = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[role="button"][aria-label="Show STCK back details"][aria-hidden="true"]'
  );
};

test.describe("BaseCard Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${STORYBOOK_URL}/iframe.html?id=game-cards-basecard--default&viewMode=story`
    );
    // Increased timeout for visibility check for reliability in CI environments
    await expect(
      page.getByTestId("header-text-clickable").getByText("Storybook Inc.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should render front face content by default", async ({ page }) => {
    const frontFace = getVisibleFrontFace(page);
    await expect(frontFace).toBeVisible();
    await expect(frontFace).toHaveAttribute("aria-pressed", "false");

    await expect(
      frontFace.getByRole("heading", { name: "Card Front" })
    ).toBeVisible();
    await expect(
      frontFace.getByText("This is the card front of the card.")
    ).toBeVisible();
    await expect(
      frontFace.getByRole("button", { name: "Face Button" })
    ).toBeVisible();

    const hiddenBackFace = getHiddenBackFace(page);
    await expect(hiddenBackFace).toBeAttached();
    await expect(hiddenBackFace).toContainText("Back Content");
  });

  test("should display company name and symbol in the header", async ({
    page,
  }) => {
    const headerTextClickable = page.getByTestId("header-text-clickable");
    await expect(headerTextClickable).toBeVisible();
    await expect(headerTextClickable.getByText("Storybook Inc.")).toBeVisible();
    await expect(headerTextClickable.getByText("(STCK)")).toBeVisible();
  });

  test("should display logo if logoUrl is provided", async ({ page }) => {
    await expect(page.locator('img[alt="Storybook Inc. logo"]')).toBeVisible();
  });

  test("should flip to back face on click and then back to front", async ({
    page,
  }) => {
    const frontFaceInitially = getVisibleFrontFace(page);
    await expect(frontFaceInitially).toBeVisible();
    await expect(frontFaceInitially).toHaveAttribute("aria-pressed", "false");

    await frontFaceInitially.click({ position: { x: 5, y: 5 } });

    const nowHiddenFrontFace = getHiddenFrontFace(page);
    await expect(nowHiddenFrontFace).toBeAttached({ timeout: 3000 });
    await expect(nowHiddenFrontFace).toHaveAttribute("aria-hidden", "true");
    await expect(nowHiddenFrontFace).toHaveAttribute("aria-pressed", "true");

    const backFaceAfterFlip = getVisibleBackFace(page);
    await expect(backFaceAfterFlip).toBeVisible({ timeout: 2000 });
    await expect(backFaceAfterFlip).toHaveAttribute("aria-pressed", "false");
    await expect(backFaceAfterFlip.getByText("Back Content")).toBeVisible();

    await backFaceAfterFlip.click({ position: { x: 5, y: 5 } });

    const nowHiddenBackFace = getHiddenBackFace(page);
    await expect(nowHiddenBackFace).toBeAttached({ timeout: 3000 });
    await expect(nowHiddenBackFace).toHaveAttribute("aria-hidden", "true");
    await expect(nowHiddenBackFace).toHaveAttribute("aria-pressed", "true");

    const frontFaceRestored = getVisibleFrontFace(page);
    await expect(frontFaceRestored).toBeVisible({ timeout: 2000 });

    await expect(
      frontFaceRestored.getByRole("heading", { name: "Card Front" })
    ).toBeVisible();

    await expect(frontFaceRestored).toHaveAttribute("aria-pressed", "false");
  });

  test("should call onDeleteRequest when delete button is clicked", async ({
    page,
  }) => {
    const visibleFrontFace = getVisibleFrontFace(page);
    await expect(visibleFrontFace).toBeVisible(); // Confirm the front face itself is visible

    const deleteButton = visibleFrontFace.locator(
      'button[aria-label="Delete STCK card"]'
    );

    await page.getByTestId("base-card-inner").hover();

    await expect(deleteButton).toBeVisible({ timeout: 500 });

    await Promise.all([
      page.waitForEvent("console", {
        predicate: (msg) => {
          const text = msg.text();
          // MODIFIED: Update predicate to match the new explicit log message
          return (
            text.startsWith(
              "PLAYWRIGHT_TEST_ACTION: onDeleteRequest triggered"
            ) && text.includes("Card ID: base-story-1")
          );
        },
        timeout: 5000,
      }),
      deleteButton.click(),
    ]);
  });

  test("should trigger generic interaction for header text click", async ({
    page,
  }) => {
    const headerTextClickable = page.getByTestId("header-text-clickable");
    await expect(headerTextClickable).toBeVisible();

    await Promise.all([
      page.waitForEvent("console", {
        predicate: (msg) => {
          const text = msg.text();
          // MODIFIED: Update predicate to match the new explicit log message format
          return (
            text.startsWith(
              "PLAYWRIGHT_TEST_ACTION: onGenericInteraction triggered"
            ) &&
            text.includes("Intent: REQUEST_NEW_CARD") &&
            text.includes("Origin: cardHeaderNameSymbol")
          );
        },
        timeout: 5000,
      }),
      headerTextClickable.click(),
    ]);
  });

  test("should trigger generic interaction for logo click (if websiteUrl exists)", async ({
    page,
  }) => {
    const logoLink = page.getByLabel("Visit Storybook Inc. website");

    await expect(logoLink).toBeVisible();

    await Promise.all([
      page.waitForEvent("console", {
        predicate: (msg) => {
          const text = msg.text();
          return (
            text.startsWith(
              "PLAYWRIGHT_TEST_ACTION: onGenericInteraction triggered"
            ) &&
            text.includes("Intent: NAVIGATE_EXTERNAL") &&
            text.includes("Origin: cardHeaderLogo")
          );
        },
        timeout: 5000,
      }),
      logoLink.click(),
    ]);
  });

  test("should not show delete button if onDeleteRequest is not provided", async ({
    page,
  }) => {
    await page.goto(
      `${STORYBOOK_URL}/iframe.html?id=game-cards-basecard--no-delete-button&viewMode=story`
    );
    await expect(
      page.getByTestId("header-text-clickable").getByText("Storybook Inc.")
    ).toBeVisible({ timeout: 10000 });

    const deleteButton = page.locator('button[aria-label="Delete STCK card"]');
    await page.getByTestId("base-card-inner").hover();
    await expect(deleteButton).not.toBeVisible();
  });
});
