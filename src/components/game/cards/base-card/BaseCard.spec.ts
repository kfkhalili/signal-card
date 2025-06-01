// src/components/game/cards/base-card/BaseCard.spec.ts
import { test, expect, type Page } from "@playwright/test";

const STORYBOOK_URL = process.env.STORYBOOK_URL || "http://localhost:6006";

// Gets the DOM element representing the FRONT surface of the card
const getFrontSurface = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[aria-label="Front of STCK card. Action: Show back details."]'
  );
};

// Gets the DOM element representing the BACK surface of the card
const getBackSurface = (page: Page) => {
  return page.locator(
    '[data-testid="base-card-inner"] > div[aria-label="Back of STCK card. Action: Show front details."]'
  );
};

test.describe("BaseCard Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${STORYBOOK_URL}/iframe.html?id=game-cards-basecard--default&viewMode=story`
    );
    await expect(
      page.getByTestId("header-text-clickable").getByText("Storybook Inc.")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should render front face content by default", async ({ page }) => {
    const frontSurface = getFrontSurface(page);
    const backSurface = getBackSurface(page);

    // Check front surface is visible and correctly attributed
    await expect(frontSurface).toBeVisible(); // Default: front is visible
    await expect(frontSurface).toHaveAttribute("aria-pressed", "false");
    await expect(frontSurface).toHaveAttribute("aria-hidden", "false");

    // Check front content
    await expect(
      frontSurface.getByRole("heading", { name: "Card Front" })
    ).toBeVisible();
    await expect(
      frontSurface.getByText("This is the card front of the card.")
    ).toBeVisible();
    await expect(
      frontSurface.getByRole("button", { name: "Face Button" })
    ).toBeVisible();

    // Check back surface is hidden and correctly attributed
    // Instead of toBeHidden(), check aria-hidden attribute
    await expect(backSurface).toHaveAttribute("aria-hidden", "true");
    await expect(backSurface).toHaveAttribute("aria-pressed", "true");

    // Check content of the (hidden) back surface
    await expect(backSurface).toContainText(
      "This is the back description from BaseCard's story context."
    );
    await expect(backSurface).toContainText("Additional Back Details");
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
    const frontSurface = getFrontSurface(page);
    const backSurface = getBackSurface(page);

    // Initial state: front visible
    await expect(frontSurface).toHaveAttribute("aria-hidden", "false");
    await expect(frontSurface).toHaveAttribute("aria-pressed", "false");
    await expect(backSurface).toHaveAttribute("aria-hidden", "true");
    await expect(backSurface).toHaveAttribute("aria-pressed", "true");

    // Click to flip to back
    await frontSurface.click({ position: { x: 5, y: 5 } });

    // After flip: back visible, front hidden
    await expect(backSurface).toBeVisible({ timeout: 2000 }); // Back surface should be visible
    await expect(backSurface).toHaveAttribute("aria-pressed", "false");
    await expect(frontSurface).toHaveAttribute("aria-hidden", "true", {
      timeout: 3000,
    }); // Front surface should now be aria-hidden
    await expect(frontSurface).toHaveAttribute("aria-pressed", "true");

    // Check content of visible back face
    await expect(
      backSurface.getByText(
        "This is the back description from BaseCard's story context."
      )
    ).toBeVisible();
    await expect(
      backSurface.getByText("Additional Back Details")
    ).toBeVisible();

    // Click to flip back to front
    await backSurface.click({ position: { x: 5, y: 5 } });

    // After flipping back: front visible, back hidden
    await expect(frontSurface).toBeVisible({ timeout: 2000 }); // Front surface should be visible again
    await expect(frontSurface).toHaveAttribute("aria-pressed", "false");
    await expect(backSurface).toHaveAttribute("aria-hidden", "true", {
      timeout: 3000,
    }); // Back surface should be aria-hidden again
    await expect(backSurface).toHaveAttribute("aria-pressed", "true");

    await expect(
      frontSurface.getByRole("heading", { name: "Card Front" })
    ).toBeVisible();
  });

  test("should call onDeleteRequest when delete button is clicked", async ({
    page,
  }) => {
    const frontSurface = getFrontSurface(page);
    await expect(frontSurface).toBeVisible();

    const deleteButton = frontSurface.locator(
      'button[aria-label="Delete STCK card"]'
    );

    await page.getByTestId("base-card-inner").hover();
    await expect(deleteButton).toBeVisible({ timeout: 500 });

    await Promise.all([
      page.waitForEvent("console", {
        predicate: (msg) => {
          const text = msg.text();
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

    const frontSurfaceNoDelete = page.locator(
      '[data-testid="base-card-inner"] > div[aria-label="Front of STCK card. Action: Show back details."]'
    );

    const deleteButton = frontSurfaceNoDelete.locator(
      'button[aria-label="Delete STCK card"]'
    );

    await page.getByTestId("base-card-inner").hover();
    await expect(deleteButton).not.toBeVisible();
  });
});
