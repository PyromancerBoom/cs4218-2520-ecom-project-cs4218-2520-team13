//Aashim Mahindroo, A0265890R

// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// Price ranges defined in Prices.js (must stay in sync with the source)
const PRICE_RANGES = [
  { label: "$0 to 19", min: 0, max: 19 },
  { label: "$20 to 39", min: 20, max: 39 },
  { label: "$40 to 59", min: 40, max: 59 },
  { label: "$60 to 79", min: 60, max: 79 },
  { label: "$80 to 99", min: 80, max: 99 },
  { label: "$100 or more", min: 100, max: 9999 },
];

// ---------------------------------------------------------------------------
// Shared state populated once in beforeAll by querying the live API.
// All tests use these variables so they work regardless of what is in the DB.
// ---------------------------------------------------------------------------
/** @type {any[]} */
let dbProducts = []; // first page (up to 6) returned by product-list/1
/** @type {any[]} */
let dbCategories = []; // all categories, each enriched with .products[]
/** @type {any[]} */
let enrichedPriceRanges = []; // PRICE_RANGES entries each enriched with .products[]
let totalCount = 0;

// Derived helpers computed after enrichment
let catWithProducts = null; // first category that has >= 1 product
let secondCatWithProducts = null; // second such category
let priceRangeWithProducts = null; // first price range that has >= 1 product
let combinedCategory = null; // category used in combined-filter test
let combinedPriceRange = null; // price range used in combined-filter test

test.describe("Home Page - Product Listing and Filtering UI Tests", () => {
  // -----------------------------------------------------------------------
  // One-time setup: load all data from the live API before any test runs.
  // -----------------------------------------------------------------------
  test.beforeAll(async ({ request }) => {
    const [catResp, countResp, prodResp] = await Promise.all([
      request.get(`${BASE_URL}/api/v1/category/get-category`),
      request.get(`${BASE_URL}/api/v1/product/product-count`),
      request.get(`${BASE_URL}/api/v1/product/product-list/1`),
    ]);

    dbCategories = (await catResp.json()).category ?? [];
    totalCount = (await countResp.json()).total ?? 0;
    dbProducts = (await prodResp.json()).products ?? [];

    // Enrich all categories and price ranges in parallel
    const [catProductsList, rangeProductsList] = await Promise.all([
      Promise.all(
        dbCategories.map((cat) =>
          request
            .post(`${BASE_URL}/api/v1/product/product-filters`, {
              data: { checked: [cat._id], radio: [] },
            })
            .then((r) => r.json())
            .then((json) => json.products ?? [])
        )
      ),
      Promise.all(
        PRICE_RANGES.map((range) =>
          request
            .post(`${BASE_URL}/api/v1/product/product-filters`, {
              data: { checked: [], radio: [range.min, range.max] },
            })
            .then((r) => r.json())
            .then((json) => json.products ?? [])
        )
      ),
    ]);

    dbCategories.forEach((cat, i) => { cat.products = catProductsList[i]; });
    enrichedPriceRanges = PRICE_RANGES.map((range, i) => ({
      ...range,
      products: rangeProductsList[i],
    }));

    // Derive helpers
    catWithProducts =
      dbCategories.find((c) => c.products.length > 0) ?? null;
    secondCatWithProducts =
      dbCategories.find(
        (c) => c !== catWithProducts && c.products.length > 0
      ) ?? null;
    priceRangeWithProducts =
      enrichedPriceRanges.find((r) => r.products.length > 0) ?? null;

    // Find first (category, priceRange) pair whose intersection is non-empty
    outer: for (const cat of dbCategories) {
      for (const range of enrichedPriceRanges) {
        const intersection = cat.products.filter((p) =>
          range.products.some((rp) => rp._id === p._id)
        );
        if (intersection.length > 0) {
          combinedCategory = cat;
          combinedPriceRange = range;
          break outer;
        }
      }
    }
  });

  // -----------------------------------------------------------------------
  // Per-test setup: clear localStorage cart so each test starts clean.
  // -----------------------------------------------------------------------
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("cart"));
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    // Wait for product cards to be present before each test
    await page.waitForSelector(".card", { timeout: 15000 });
    await page.waitForTimeout(300);
  });

  // =========================================================================
  // Product Display
  // =========================================================================
  test.describe("Product Display", () => {
    test("should display All Products heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "All Products" })
      ).toBeVisible();
    });

    test("should display product cards with name, price and description", async ({
      page,
    }) => {
      const cards = page.locator(".card");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      expect(await cards.count()).toBeGreaterThan(0);

      const first = cards.first();
      await expect(
        first.locator(".card-title:not(.card-price)")
      ).toBeVisible();
      await expect(first.locator(".card-price")).toBeVisible();
      await expect(first.locator(".card-text")).toBeVisible();
    });

    test("should display product prices in USD currency format", async ({
      page,
    }) => {
      const prices = page.locator(".card-price");
      await expect(prices.first()).toBeVisible({ timeout: 10000 });
      expect(await prices.first().textContent()).toMatch(/\$/);
    });

    test("should display product images in cards", async ({ page }) => {
      const cards = page.locator(".card");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      await expect(
        cards.first().locator("img.card-img-top")
      ).toBeVisible();
    });

    test("should display More Details button for each product", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "More Details" }).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("should display ADD TO CART button for each product", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test("should truncate product descriptions to at most 65 characters", async ({
      page,
    }) => {
      const descs = page.locator(".card-text");
      await expect(descs.first()).toBeVisible({ timeout: 10000 });
      const count = await descs.count();
      for (let i = 0; i < count; i++) {
        const text = await descs.nth(i).textContent();
        if (text?.trim().length) {
          expect(text.trim().length).toBeLessThanOrEqual(65);
        }
      }
    });

    test("should display all first-page products returned by the API", async ({
      page,
    }) => {
      test.skip(
        dbProducts.length === 0,
        "No products in the database"
      );
      for (const product of dbProducts) {
        await expect(
          page.getByText(product.name, { exact: true }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test("should display at most 6 products per page", async ({ page }) => {
      const cards = page.locator(".card");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      expect(await cards.count()).toBeLessThanOrEqual(6);
    });
  });

  // =========================================================================
  // Filter Sidebar
  // =========================================================================
  test.describe("Filter Sidebar", () => {
    test("should display Filter By Category section", async ({ page }) => {
      await expect(page.getByText("Filter By Category")).toBeVisible();
    });

    test("should display a checkbox for each category in the database", async ({
      page,
    }) => {
      const checkboxes = page.locator(".filters .ant-checkbox-wrapper");
      await expect(checkboxes.first()).toBeVisible({ timeout: 15000 });
      expect(await checkboxes.count()).toBeGreaterThanOrEqual(
        dbCategories.length
      );
    });

    test("should display all 6 price range radio buttons", async ({
      page,
    }) => {
      const radios = page.locator(".filters .ant-radio-wrapper");
      await expect(radios.first()).toBeVisible({ timeout: 10000 });
      expect(await radios.count()).toBe(PRICE_RANGES.length);
    });

    test("should display RESET FILTERS button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "RESET FILTERS" })
      ).toBeVisible();
    });

    test("should display all 6 price range labels from Prices.js", async ({
      page,
    }) => {
      for (const range of PRICE_RANGES) {
        await expect(
          page.getByText(range.label)
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test("should show a checkbox label for every category returned by the API", async ({
      page,
    }) => {
      for (const cat of dbCategories) {
        await expect(
          page
            .locator(".filters .ant-checkbox-wrapper")
            .filter({ hasText: cat.name })
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  // =========================================================================
  // Category Filtering
  // =========================================================================
  test.describe("Category Filtering", () => {
    test("should filter products when a category is selected", async ({
      page,
    }) => {
      test.skip(!catWithProducts, "No categories with products in database");

      const checkbox = page
        .locator(".filters .ant-checkbox-wrapper")
        .filter({ hasText: catWithProducts.name });
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.click();
      await page.waitForTimeout(1000);

      // At least the first product in this category must appear
      await expect(
        page.getByText(catWithProducts.products[0].name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show the union of products when two categories are selected", async ({
      page,
    }) => {
      test.skip(
        !catWithProducts || !secondCatWithProducts,
        "Need at least 2 categories with products"
      );

      const cb1 = page
        .locator(".filters .ant-checkbox-wrapper")
        .filter({ hasText: catWithProducts.name });
      const cb2 = page
        .locator(".filters .ant-checkbox-wrapper")
        .filter({ hasText: secondCatWithProducts.name });

      await expect(cb1).toBeVisible({ timeout: 10000 });
      await cb1.click();
      await page.waitForTimeout(300);
      await cb2.click();
      await page.waitForTimeout(1000);

      // Products from both categories should appear
      await expect(
        page.getByText(catWithProducts.products[0].name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByText(secondCatWithProducts.products[0].name, { exact: true }).first()
      ).toBeVisible();
    });
  });

  // =========================================================================
  // Price Filtering
  // =========================================================================
  test.describe("Price Filtering", () => {
    test("should filter products by a price range that has matching products", async ({
      page,
    }) => {
      test.skip(!priceRangeWithProducts, "No products found in any price range");

      const radio = page
        .locator(".filters .ant-radio-wrapper")
        .filter({ hasText: priceRangeWithProducts.label });
      await expect(radio).toBeVisible({ timeout: 10000 });
      await radio.click();
      await page.waitForTimeout(1000);

      await expect(
        page.getByText(priceRangeWithProducts.products[0].name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("should have all 6 price range radio buttons selectable", async ({
      page,
    }) => {
      for (const range of PRICE_RANGES) {
        await expect(
          page.locator(".filters .ant-radio-wrapper").filter({
            hasText: range.label,
          })
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // =========================================================================
  // Combined Category + Price Filtering
  // =========================================================================
  test.describe("Combined Filtering", () => {
    test("should show 0 results when category + price filter combination has no matches", async ({
      page,
    }) => {
      let emptyComboCategory = null;
      let emptyComboRange = null;

      outer: for (const cat of dbCategories) {
        for (const range of enrichedPriceRanges) {
          const hasIntersection = cat.products.some((p) =>
            range.products.some((rp) => rp._id === p._id)
          );
          // Both filters must have products individually, but no overlap
          if (
            !hasIntersection &&
            cat.products.length > 0 &&
            range.products.length > 0
          ) {
            emptyComboCategory = cat;
            emptyComboRange = range;
            break outer;
          }
        }
      }

      test.skip(
        !emptyComboCategory,
        "Could not find a category+price combo with no overlap in this database"
      );

      const checkbox = page
        .locator(".filters .ant-checkbox-wrapper")
        .filter({ hasText: emptyComboCategory.name });
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.click();
      await page.waitForTimeout(300);

      const radio = page
        .locator(".filters .ant-radio-wrapper")
        .filter({ hasText: emptyComboRange.label });
      await radio.click();
      // Wait for both filter API calls to settle (category then category+price)
      await page.waitForFunction(
        () => document.querySelectorAll(".card").length === 0,
        { timeout: 10000 }
      );

      expect(await page.locator(".card").count()).toBe(0);
    });
  });

  // =========================================================================
  // Load More
  // =========================================================================
  test.describe("Load More", () => {
    test("should show Load More button only when total products exceed page size 6", async ({
      page,
    }) => {
      const loadMoreBtn = page.locator("button.loadmore");
      await page.waitForTimeout(2000);

      if (totalCount > 6) {
        await expect(loadMoreBtn).toBeVisible({ timeout: 5000 });
      } else {
        await expect(loadMoreBtn).not.toBeVisible();
      }
    });

    test("should load additional products when Load More is clicked", async ({
      page,
    }) => {
      test.skip(
        totalCount <= 6,
        `Database has ${totalCount} products (≤6) – no Load More button to test`
      );

      const loadMoreBtn = page.locator("button.loadmore");
      await expect(loadMoreBtn).toBeVisible({ timeout: 10000 });

      const beforeCount = await page.locator(".card").count();
      await loadMoreBtn.click();

      await page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/product/product-list/2") &&
          res.status() === 200,
        { timeout: 10000 }
      );
      await page.waitForTimeout(500);

      const afterCount = await page.locator(".card").count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    });
  });

  // =========================================================================
  // More Details Navigation
  // =========================================================================
  test.describe("More Details Navigation", () => {
    test("should navigate to /product/:slug when More Details is clicked", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "More Details" }).first()
      ).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "More Details" }).first().click();

      await page.waitForURL("**/product/**", { timeout: 10000 });
      await expect(page).toHaveURL(/\/product\/.+/);
    });

    test("should navigate to the correct slug for a specific product", async ({
      page,
    }) => {
      test.skip(dbProducts.length === 0, "No products in the database");

      const first = dbProducts[0];
      const card = page.locator(".card").filter({
        has: page.locator(".card-title", { hasText: first.name }),
      });
      await expect(card).toBeVisible({ timeout: 10000 });
      await card.getByRole("button", { name: "More Details" }).click();

      await page.waitForURL(`**/product/${first.slug}**`, {
        timeout: 10000,
      });
      await expect(page).toHaveURL(new RegExp(first.slug));
    });
  });

  // =========================================================================
  // Add to Cart from Home Page
  // =========================================================================
  test.describe("Add to Cart from Home Page", () => {
    test("should show success toast when adding a product to cart", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).first()
      ).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "ADD TO CART" }).first().click();
      await expect(
        page.getByText("Item Added to cart")
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show error toast when adding duplicate product to cart", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).first()
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole("button", { name: "ADD TO CART" }).first().click();
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: "ADD TO CART" }).first().click();

      await expect(
        page.getByText("Item already in cart")
      ).toBeVisible({ timeout: 5000 });
    });

    test("should reflect added product on the cart page", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).first()
      ).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "ADD TO CART" }).first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(/You Have 1 items in your cart/)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should add two different products and show count 2 in cart", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).nth(1)
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole("button", { name: "ADD TO CART" }).first().click();
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "ADD TO CART" }).nth(1).click();
      await page.waitForTimeout(600);

      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(/You Have 2 items in your cart/)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should persist cart items after navigating away and returning", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: "ADD TO CART" }).first()
      ).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: "ADD TO CART" }).first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/about`);
      await page.goto(BASE_URL);
      await page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/product/product-list/") &&
          res.status() === 200,
        { timeout: 15000 }
      );

      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(/You Have 1 items in your cart/)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  // =========================================================================
  // Filter then Add to Cart (E2E flows)
  // =========================================================================
  test.describe("Filter then Add to Cart (E2E flow)", () => {
    test("should filter by category, add the first result to cart, and confirm in cart", async ({
      page,
    }) => {
      test.skip(
        !catWithProducts,
        "No categories with products in database"
      );

      const checkbox = page
        .locator(".filters .ant-checkbox-wrapper")
        .filter({ hasText: catWithProducts.name });
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.click();
      await page.waitForTimeout(1000);

      const expected = catWithProducts.products[0];
      await expect(
        page.getByText(expected.name, { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      const productCard = page.locator(".card").filter({
        has: page.locator(".card-title", { hasText: expected.name }),
      });
      await productCard
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(
        page.getByText("Item Added to cart")
      ).toBeVisible({ timeout: 5000 });

      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(expected.name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("should filter by price range, add the first result to cart, and confirm in cart", async ({
      page,
    }) => {
      test.skip(
        !priceRangeWithProducts,
        "No products in any price range"
      );

      const radio = page
        .locator(".filters .ant-radio-wrapper")
        .filter({ hasText: priceRangeWithProducts.label });
      await expect(radio).toBeVisible({ timeout: 10000 });
      await radio.click();
      await page.waitForTimeout(1000);

      const expected = priceRangeWithProducts.products[0];
      await expect(
        page.getByText(expected.name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });

      const productCard = page.locator(".card").filter({
        has: page.locator(".card-title", { hasText: expected.name }),
      });
      await productCard
        .getByRole("button", { name: "ADD TO CART" })
        .click();
      await expect(
        page.getByText("Item Added to cart")
      ).toBeVisible({ timeout: 5000 });

      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(expected.name, { exact: true }).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
