//Aashim Mahindroo, A0265890R

// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helper – navigate to a page that uses Layout (and therefore renders Footer)
// ---------------------------------------------------------------------------
async function gotoHome(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
test.describe("Footer - Navigation Links UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
  });

  // =========================================================================
  // Copyright text
  // =========================================================================
  test.describe("Copyright Text", () => {
    test("should display copyright symbol in the footer", async ({ page }) => {
      const footer = page.locator(".footer");
      await expect(footer).toBeVisible();
      await expect(footer).toContainText("©");
    });

    test("should display 'All Rights Reserved' in the footer", async ({
      page,
    }) => {
      await expect(page.locator(".footer")).toContainText("All Rights Reserved");
    });

    test("should display company name 'TestingComp' in the footer", async ({
      page,
    }) => {
      await expect(page.locator(".footer")).toContainText("TestingComp");
    });

    test("should render the copyright line inside an h4 element", async ({
      page,
    }) => {
      const heading = page.locator(".footer h4");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("All Rights Reserved");
    });

    test("should have text-center class on the copyright h4", async ({
      page,
    }) => {
      const heading = page.locator(".footer h4");
      await expect(heading).toHaveClass(/text-center/);
    });
  });

  // =========================================================================
  // Link Visibility
  // =========================================================================
  test.describe("Link Visibility", () => {
    test("should display the About link in the footer", async ({ page }) => {
      await expect(
        page.locator(".footer").getByRole("link", { name: "About" })
      ).toBeVisible();
    });

    test("should display the Contact link in the footer", async ({ page }) => {
      await expect(
        page.locator(".footer").getByRole("link", { name: "Contact" })
      ).toBeVisible();
    });

    test("should display the Privacy Policy link in the footer", async ({
      page,
    }) => {
      await expect(
        page.locator(".footer").getByRole("link", { name: "Privacy Policy" })
      ).toBeVisible();
    });

    test("should render all three links inside a paragraph with text-center class", async ({
      page,
    }) => {
      const paragraph = page.locator(".footer p.text-center");
      await expect(paragraph).toBeVisible();
      await expect(
        paragraph.getByRole("link", { name: "About" })
      ).toBeVisible();
      await expect(
        paragraph.getByRole("link", { name: "Contact" })
      ).toBeVisible();
      await expect(
        paragraph.getByRole("link", { name: "Privacy Policy" })
      ).toBeVisible();
    });
  });

  // =========================================================================
  // Link Separators
  // =========================================================================
  test.describe("Link Separators", () => {
    test("should separate footer links with the | character", async ({
      page,
    }) => {
      const paragraph = page.locator(".footer p.text-center");
      const text = await paragraph.innerText();
      // Expect two pipe characters: About | Contact | Privacy Policy
      expect(text).toContain("|");
      expect((text.match(/\|/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });

    test("should have About link before the first | separator", async ({
      page,
    }) => {
      const paragraph = page.locator(".footer p.text-center");
      const text = await paragraph.innerText();
      const pipeIndex = text.indexOf("|");
      const aboutIndex = text.indexOf("About");
      expect(aboutIndex).toBeGreaterThanOrEqual(0);
      expect(aboutIndex).toBeLessThan(pipeIndex);
    });

    test("should have Privacy Policy link after the last | separator", async ({
      page,
    }) => {
      const paragraph = page.locator(".footer p.text-center");
      const text = await paragraph.innerText();
      const lastPipeIndex = text.lastIndexOf("|");
      const policyIndex = text.indexOf("Privacy Policy");
      expect(policyIndex).toBeGreaterThan(lastPipeIndex);
    });
  });

  // =========================================================================
  // Link Routing
  // =========================================================================
  test.describe("Link Routing", () => {
    test("should navigate to /about when About link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".footer")
        .getByRole("link", { name: "About" })
        .click();
      await expect(page).toHaveURL(/\/about/, { timeout: 5000 });
    });

    test("should display the About page after clicking the About link", async ({
      page,
    }) => {
      await page
        .locator(".footer")
        .getByRole("link", { name: "About" })
        .click();
      await page.waitForLoadState("networkidle");
      // About.js uses Layout with title "About us - Ecommerce app"
      await expect(page).toHaveTitle(/About us/i, { timeout: 5000 });
    });

    test("should navigate to /contact when Contact link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".footer")
        .getByRole("link", { name: "Contact" })
        .click();
      await expect(page).toHaveURL(/\/contact/, { timeout: 5000 });
    });

    test("should navigate to /policy when Privacy Policy link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".footer")
        .getByRole("link", { name: "Privacy Policy" })
        .click();
      await expect(page).toHaveURL(/\/policy/, { timeout: 5000 });
    });

    test("should display the Privacy Policy page after clicking the Privacy Policy link", async ({
      page,
    }) => {
      await page
        .locator(".footer")
        .getByRole("link", { name: "Privacy Policy" })
        .click();
      await page.waitForLoadState("networkidle");
      // Policy.js uses Layout with title "Privacy Policy"
      await expect(page).toHaveTitle(/Privacy Policy/i, { timeout: 5000 });
    });
  });

  // =========================================================================
  // Footer present on multiple pages (rendered via Layout)
  // =========================================================================
  test.describe("Footer Persistence Across Pages", () => {
    test("should render the footer on the About page", async ({ page }) => {
      await page.goto(`${BASE_URL}/about`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".footer")).toBeVisible();
      await expect(page.locator(".footer")).toContainText("All Rights Reserved");
    });

    test("should render the footer on the Privacy Policy page", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/policy`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator(".footer")).toBeVisible();
      await expect(page.locator(".footer")).toContainText("All Rights Reserved");
    });

    test("should render footer links on the About page", async ({ page }) => {
      await page.goto(`${BASE_URL}/about`);
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator(".footer").getByRole("link", { name: "About" })
      ).toBeVisible();
      await expect(
        page.locator(".footer").getByRole("link", { name: "Contact" })
      ).toBeVisible();
      await expect(
        page.locator(".footer").getByRole("link", { name: "Privacy Policy" })
      ).toBeVisible();
    });
  });

  // =========================================================================
  // Styling
  // =========================================================================
  test.describe("Footer Styling", () => {
    test("should have the footer div with class 'footer'", async ({ page }) => {
      await expect(page.locator(".footer")).toBeVisible();
    });

    test("should have text-center class on the links paragraph", async ({
      page,
    }) => {
      await expect(page.locator(".footer p.text-center")).toBeVisible();
    });

    test("should show the footer below the main content", async ({ page }) => {
      const mainBox = await page.locator("main").boundingBox();
      const footerBox = await page.locator(".footer").boundingBox();
      // Footer's top edge should be at or below the main content's top edge
      expect(footerBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(footerBox.y).toBeGreaterThanOrEqual(mainBox.y);
    });
  });
});
