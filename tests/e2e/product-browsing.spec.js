// Lim Yik Seng, A0338506B
import dotenv from "dotenv";
dotenv.config();
import { test, expect } from "@playwright/test";
import {
  connectTestDB,
  disconnectTestDB,
  clearTestCollections,
  seedCategory,
  seedProduct,
} from "../helpers/e2eDb.js";

test.describe("Product Browsing and Detail Viewing Flow", () => {
  let testCategory;
  let emptyCategory;
  let testProduct;

  // Lim Yik Seng, A0338506B
  test.beforeAll(async () => {
    await connectTestDB();
    await clearTestCollections();

    testCategory = await seedCategory({
      name: "E2E Electronics",
      slug: "e2e-electronics",
    });

    emptyCategory = await seedCategory({
      name: "E2E Empty Category",
      slug: "e2e-empty-category",
    });

    testProduct = await seedProduct({
      name: "E2E Gaming Laptop",
      slug: "e2e-gaming-laptop",
      description: "A high-end laptop specifically seeded for E2E testing flow.",
      price: 1500,
      category: testCategory._id,
    });
  });

  // Lim Yik Seng, A0338506B
  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  // Lim Yik Seng, A0338506B
  test("1. complete browsing flow: home -> categories -> category page -> product details", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("E2E Gaming Laptop")).toBeVisible({ timeout: 10000 });

    await page.getByText("Categories").first().click();
    
    await page.getByRole("link", { name: "E2E Electronics" }).click();
    
    await expect(page).toHaveURL(/\/category\/e2e-electronics/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Category - E2E Electronics" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 result found")).toBeVisible({ timeout: 10000 });
    
    await page.getByRole("button", { name: "More Details" }).first().click();

    await expect(page).toHaveURL(/\/product\/e2e-gaming-laptop/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Product Details" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Name : E2E Gaming Laptop")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Category : E2E Electronics")).toBeVisible({ timeout: 10000 });
  });

  // Lim Yik Seng, A0338506B
  test("2. direct browsing flow: home directly to product details", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("E2E Gaming Laptop")).toBeVisible({ timeout: 10000 });

    const productCard = page.locator(".card", { hasText: "E2E Gaming Laptop" });
    await productCard.getByRole("button", { name: "More Details" }).click();

    await expect(page).toHaveURL(/\/product\/e2e-gaming-laptop/, { timeout: 10000 });
    await expect(page.getByText("Name : E2E Gaming Laptop")).toBeVisible({ timeout: 10000 });
  });

  // Lim Yik Seng, A0338506B
  test("3. browsing an empty category shows 0 results", async ({ page }) => {
    await page.goto("/category/e2e-empty-category");

    await expect(page.getByRole("heading", { name: "Category - E2E Empty Category" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("0 result found")).toBeVisible({ timeout: 10000 });
    
    await expect(page.getByText("More Details")).not.toBeVisible({ timeout: 10000 });
  });

});