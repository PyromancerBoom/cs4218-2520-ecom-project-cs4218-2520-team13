// Priyansh Bimbisariye, A0265903B
import { test, expect } from "@playwright/test";
import path from "path";
import {
  connectTestDB, disconnectTestDB, clearTestCollections,
  seedAdmin, seedCategory, seedProduct,
} from "../helpers/e2eDb.js";

// Priyansh Bimbisariye, A0265903B
const TEST_IMAGE = path.join(process.cwd(), "tests/test_assets/test-image.jpg");

// Priyansh Bimbisariye, A0265903B
async function fillAndCreateProduct(
  page,
  name,
  desc,
  price,
  qty,
  shipping = "Yes",
) {
  await page.goto("/dashboard/admin/create-product");
  await expect(
    page.getByRole("heading", { name: "Create Product" }),
  ).toBeVisible();

  // pick category
  await page.locator("#category-select").click();
  await page.getByTitle("Test Category").locator("div").click();

  // upload photo
  await page.getByText("Upload Photo").click();
  await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

  // fill fields
  await page.getByRole("textbox", { name: "Write a name" }).fill(name);
  await page.getByRole("textbox", { name: "Write a description" }).fill(desc);
  await page.getByPlaceholder("Write a price").fill(price);
  await page.getByPlaceholder("Write a quantity").fill(qty);

  // pick shipping
  await page.locator("#shipping-select").click();
  await page.getByText(shipping, { exact: true }).click();

  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
}

// Priyansh Bimbisariye, A0265903B
test.describe("Admin Product Management", () => {
  // Priyansh Bimbisariye, A0265903B
  test.beforeAll(async () => {
    await connectTestDB();
    await clearTestCollections();
    await seedAdmin({ email: "admin@admin.com", plainPassword: "admin", name: "Admin" });
    const category = await seedCategory({ name: "Test Category", slug: "test-category" });
    await seedProduct({
      name: "Seeded Test Product",
      slug: "seeded-test-product",
      description: "A seeded product for E2E testing",
      category: category._id,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  // Priyansh Bimbisariye, A0265903B
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill("admin@admin.com");
    await page.getByRole("textbox", { name: "Password" }).fill("admin");
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page.getByText("login successfully")).toBeVisible({
      timeout: 10000,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test("admin can login and navigate to products page", async ({ page }) => {
    await page.goto("/dashboard/admin/products");

    await expect(page).toHaveURL(/products/);
    await expect(
      page.getByRole("heading", { name: "All Products List" }),
    ).toBeVisible();
  });

  // Priyansh Bimbisariye, A0265903B
  test("products page shows seeded product", async ({ page }) => {
    await page.goto("/dashboard/admin/products");

    await expect(page.getByText("Seeded Test Product")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("A seeded product for E2E testing"),
    ).toBeVisible();
  });

  // Priyansh Bimbisariye, A0265903B
  test("create product with valid fields", async ({ page }) => {
    const name = "Test Product " + Date.now();

    await fillAndCreateProduct(page, name, "test description", "49.99", "5");

    await expect(page.getByText("Product Created Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test("create product with shipping set to No", async ({ page }) => {
    const name = "Test NoShip Product " + Date.now();

    await fillAndCreateProduct(
      page,
      name,
      "no shipping product",
      "30",
      "4",
      "No",
    );

    await expect(page.getByText("Product Created Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test("creating product without filling fields shows error", async ({
    page,
  }) => {
    await page.goto("/dashboard/admin/create-product");
    await expect(
      page.getByRole("heading", { name: "Create Product" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    await expect(page.getByText("Please fill all the fields")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/create-product/);
  });

  // Priyansh Bimbisariye, A0265903B
  test("update page has product data pre-filled", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await expect(page.getByText("Seeded Test Product")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("link", { name: /Seeded Test Product/ }).click();

    await expect(
      page.getByRole("heading", { name: "Update Product" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("textbox", { name: "Write a name" }),
    ).toHaveValue("Seeded Test Product");
    await expect(
      page.getByRole("textbox", { name: "Write a description" }),
    ).toHaveValue("A seeded product for E2E testing");
  });

  // Priyansh Bimbisariye, A0265903B
  test("can update a product name", async ({ page }) => {
    const original = "Update Target " + Date.now();
    const updated = "Updated Name " + Date.now();

    // create a product to update
    await fillAndCreateProduct(page, original, "to be updated", "25", "2");
    await expect(page.getByText("Product Created Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });

    // go to its update page
    await expect(page.getByText(original, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("link", { name: new RegExp(original) }).click();
    await expect(
      page.getByRole("textbox", { name: "Write a name" }),
    ).toHaveValue(original, { timeout: 10000 });

    // change name and save
    await page.getByRole("textbox", { name: "Write a name" }).fill(updated);
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    await expect(page.getByText("Product Updated Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(updated, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // verify other fields were preserved
    await page.getByRole("link", { name: new RegExp(updated) }).click();
    await expect(
      page.getByRole("textbox", { name: "Write a description" }),
    ).toHaveValue("to be updated", { timeout: 10000 });
    await expect(page.getByPlaceholder("Write a price")).toHaveValue("25", {
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Write a quantity")).toHaveValue("2", {
      timeout: 10000,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test("can delete a product by confirming the prompt", async ({ page }) => {
    const name = "Delete Target " + Date.now();

    // create one to delete
    await fillAndCreateProduct(page, name, "will be deleted", "10", "1");
    await expect(page.getByText("Product Created Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });

    page.once("dialog", (dialog) => {
      dialog.accept();
    });

    // go to update page
    await expect(page.getByText(name, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(
      page.getByRole("textbox", { name: "Write a name" }),
    ).toHaveValue(name, { timeout: 10000 });

    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await expect(page.getByText("Product Deleted Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(name, { exact: true })).not.toBeVisible({
      timeout: 10000,
    });
  });

  // Priyansh Bimbisariye, A0265903B
  test("full product lifecycle: create, view, update, delete", async ({
    page,
  }) => {
    const name = "Lifecycle " + Date.now();
    const updatedName = "Lifecycle Updated " + Date.now();

    // create
    await fillAndCreateProduct(page, name, "lifecycle test", "75", "3");
    await expect(page.getByText("Product Created Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });

    // view - check it shows up in the list
    await expect(page.getByText(name, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // update
    await page.getByRole("link", { name: new RegExp(name) }).click();
    await expect(
      page.getByRole("textbox", { name: "Write a name" }),
    ).toHaveValue(name, { timeout: 10000 });
    await page.getByRole("textbox", { name: "Write a name" }).fill(updatedName);
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    await expect(page.getByText("Product Updated Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // delete
    page.once("dialog", (dialog) => {
      dialog.accept();
    });
    await page.getByRole("link", { name: new RegExp(updatedName) }).click();
    await expect(
      page.getByRole("textbox", { name: "Write a name" }),
    ).toHaveValue(updatedName, { timeout: 10000 });
    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await expect(page.getByText("Product Deleted Successfully")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/products/, { timeout: 10000 });
    await expect(page.getByText(updatedName, { exact: true })).not.toBeVisible({
      timeout: 10000,
    });
  });
});
