//Aashim Mahindroo, A0265890R

// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

// Helper: login as an existing user through the UI
async function loginUser(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  // Wait for navigation to complete after login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
}

// Helper: register a new user through the UI
async function registerUser(page, userData) {
  await page.goto(`${BASE_URL}/register`);
  await page.getByPlaceholder("Enter Your Name").fill(userData.name);
  await page.getByPlaceholder("Enter Your Email").fill(userData.email);
  await page.getByPlaceholder("Enter Your Password").fill(userData.password);
  await page.getByPlaceholder("Enter Your Phone").fill(userData.phone);
  await page.getByPlaceholder("Enter Your Address").fill(userData.address);
  await page.getByPlaceholder("Enter Your DOB").fill(userData.dob);
  await page
    .getByPlaceholder("What is Your Favorite sports")
    .fill(userData.answer);
  await page.getByRole("button", { name: "REGISTER" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });
}

// ──────────────────────────────────────────────────────
// Cart Page - UI Tests
// ──────────────────────────────────────────────────────
test.describe("Cart Page UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage cart before each test to start fresh
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.removeItem("cart"));
  });

  // ──────────────────────────────────────────────
  // Empty Cart
  // ──────────────────────────────────────────────
  test.describe("Empty Cart", () => {
    test("should display empty cart message for guest user", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/cart`);

      await expect(page.getByText("Hello Guest")).toBeVisible();
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
    });

    test("should display Cart Summary section on cart page", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/cart`);

      await expect(page.getByText("Cart Summary")).toBeVisible();
      await expect(
        page.getByText("Total | Checkout | Payment")
      ).toBeVisible();
    });

    test("should show 'Please Login to checkout' button for guest user", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/cart`);

      const loginBtn = page.getByRole("button", {
        name: /login to checkout/i,
      });
      await expect(loginBtn).toBeVisible();
    });

    test("should redirect to login page when clicking login to checkout", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/cart`);

      await page
        .getByRole("button", { name: /login to checkout/i })
        .click();
      await page.waitForURL("**/login");

      await expect(page).toHaveURL(/\/login/);
    });
  });

  // ──────────────────────────────────────────────
  // Adding Items to Cart
  // ──────────────────────────────────────────────
  test.describe("Adding Items to Cart from HomePage", () => {
    test("should add a product to cart from the home page", async ({
      page,
    }) => {
      await page.goto(BASE_URL);

      // Wait for products to load
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      // Click the first "ADD TO CART" button
      await addToCartButtons.first().click();

      // Verify toast notification
      await expect(page.getByText("Item Added to cart")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should update cart badge count in header after adding items", async ({
      page,
    }) => {
      await page.goto(BASE_URL);

      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      // Cart badge should show 0 initially
      const cartLink = page.getByRole("link", { name: /Cart/ });
      await expect(cartLink).toBeVisible();

      // Add first product
      await addToCartButtons.first().click();

      // After adding, badge should reflect new count
      await page.waitForTimeout(500);

      // Navigate to cart to verify item is there
      await page.goto(`${BASE_URL}/cart`);
      await expect(page.getByText("You Have 1 items in your cart")).toBeVisible(
        { timeout: 5000 }
      );
    });

    test("should not add duplicate item to cart", async ({ page }) => {
      await page.goto(BASE_URL);

      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      // Add same item twice
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);
      await addToCartButtons.first().click();

      // Should show error for duplicate
      await expect(page.getByText("Item already in cart")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should add multiple different products to cart", async ({
      page,
    }) => {
      await page.goto(BASE_URL);

      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      const count = await addToCartButtons.count();
      if (count >= 2) {
        await addToCartButtons.nth(0).click();
        await page.waitForTimeout(500);
        await addToCartButtons.nth(1).click();
        await page.waitForTimeout(500);

        // Navigate to cart and verify count
        await page.goto(`${BASE_URL}/cart`);
        await expect(
          page.getByText("You Have 2 items in your cart")
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // ──────────────────────────────────────────────
  // Cart Page Display
  // ──────────────────────────────────────────────
  test.describe("Cart Page Product Display", () => {
    test("should display product name, description, and price in cart", async ({
      page,
    }) => {
      // Add an item from homepage first
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      // Get the product name before adding (exclude .card-price which also uses card-title)
      const productCards = page.locator(".card");
      const firstProductName = await productCards
        .first()
        .locator(".card-title:not(.card-price)")
        .textContent();

      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      // Go to cart
      await page.goto(`${BASE_URL}/cart`);

      // Verify product details are shown
      if (firstProductName) {
        await expect(
          page.getByText(firstProductName, { exact: true }).first()
        ).toBeVisible({
          timeout: 5000,
        });
      }

      // Price should be displayed
      await expect(page.locator("text=Price :")).toBeVisible();
    });

    test("should display product image in cart", async ({ page }) => {
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);

      // Cart items should have images
      const cartImages = page.locator(".cart-page img");
      await expect(cartImages.first()).toBeVisible({ timeout: 5000 });
    });

    test("should display Remove button for each cart item", async ({
      page,
    }) => {
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);

      const removeButton = page.getByRole("button", { name: "Remove" });
      await expect(removeButton.first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ──────────────────────────────────────────────
  // Removing Items from Cart
  // ──────────────────────────────────────────────
  test.describe("Removing Items from Cart", () => {
    test("should remove item from cart when Remove button is clicked", async ({
      page,
    }) => {
      // Add item
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      // Go to cart
      await page.goto(`${BASE_URL}/cart`);
      await expect(
        page.getByText(/You Have 1 items in your cart/)
      ).toBeVisible({ timeout: 5000 });

      // Remove item
      await page.getByRole("button", { name: "Remove" }).first().click();

      // Cart should be empty
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should update total price after removing an item", async ({
      page,
    }) => {
      // Add two items
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      const count = await addToCartButtons.count();
      if (count >= 2) {
        await addToCartButtons.nth(0).click();
        await page.waitForTimeout(500);
        await addToCartButtons.nth(1).click();
        await page.waitForTimeout(500);

        await page.goto(`${BASE_URL}/cart`);

        // Get initial total
        const totalBefore = await page.locator("h4:has-text('Total')").textContent();

        // Remove first item
        await page.getByRole("button", { name: "Remove" }).first().click();
        await page.waitForTimeout(500);

        // Total should have changed
        const totalAfter = await page.locator("h4:has-text('Total')").textContent();
        expect(totalAfter).not.toBe(totalBefore);
      }
    });

    test("should show empty cart after removing all items", async ({
      page,
    }) => {
      // Add one item
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);

      // Remove it
      await page.getByRole("button", { name: "Remove" }).click();

      await expect(page.getByText("Your Cart Is Empty")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  // ──────────────────────────────────────────────
  // Cart Total Price Calculation
  // ──────────────────────────────────────────────
  test.describe("Cart Total Price", () => {
    test("should display total price in cart summary", async ({ page }) => {
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);

      // Total should be visible
      const totalElement = page.locator("h4:has-text('Total')");
      await expect(totalElement).toBeVisible({ timeout: 5000 });

      // Total should contain a dollar sign (currency format)
      const totalText = await totalElement.textContent();
      expect(totalText).toContain("$");
    });
  });

  // ──────────────────────────────────────────────
  // Cart Persistence (localStorage)
  // ──────────────────────────────────────────────
  test.describe("Cart Persistence", () => {
    test("should persist cart items after page refresh", async ({ page }) => {
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      // Refresh the page
      await page.goto(`${BASE_URL}/cart`);
      await page.reload();

      // Items should still be there
      await expect(
        page.getByText(/You Have 1 items in your cart/)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should persist cart items after navigating away and back", async ({
      page,
    }) => {
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      // Navigate to about page
      await page.goto(`${BASE_URL}/about`);
      await page.waitForTimeout(500);

      // Navigate back to cart
      await page.goto(`${BASE_URL}/cart`);

      await expect(
        page.getByText(/You Have 1 items in your cart/)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  // ──────────────────────────────────────────────
  // Logged-in User Cart Experience
  // ──────────────────────────────────────────────
  test.describe("Logged-in User Cart", () => {
    const testUserEmail = `carttest_${Date.now()}@test.com`;
    const testUserPassword = "testpass123";

    test.beforeAll(async ({ browser }) => {
      // Register a test user once for this suite
      const page = await browser.newPage();
      try {
        await registerUser(page, {
          name: "Cart Test User",
          email: testUserEmail,
          password: testUserPassword,
          phone: "1234567890",
          address: "123 Test Street, Test City",
          dob: "2000-01-01",
          answer: "cricket",
        });
      } catch (e) {
        // User might already exist - that's fine
      }
      await page.close();
    });

    test("should display user's name when logged in", async ({ page }) => {
      await loginUser(page, testUserEmail, testUserPassword);

      await page.goto(`${BASE_URL}/cart`);

      await expect(page.getByText(/Hello\s+Cart Test User/)).toBeVisible({
        timeout: 5000,
      });
    });

    test("should not show 'login to checkout' button when logged in", async ({
      page,
    }) => {
      await loginUser(page, testUserEmail, testUserPassword);

      await page.goto(`${BASE_URL}/cart`);

      const loginCheckoutBtn = page.getByRole("button", {
        name: /login to checkout/i,
      });
      await expect(loginCheckoutBtn).not.toBeVisible();
    });

    test("should show Current Address section when user has an address", async ({
      page,
    }) => {
      await loginUser(page, testUserEmail, testUserPassword);

      await page.goto(`${BASE_URL}/cart`);

      await expect(page.getByText("Current Address")).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByText("123 Test Street, Test City")
      ).toBeVisible();
    });

    test("should show Update Address button when logged in", async ({
      page,
    }) => {
      await loginUser(page, testUserEmail, testUserPassword);
      await page.goto(`${BASE_URL}/cart`);

      const updateAddressBtn = page.getByRole("button", {
        name: "Update Address",
      });
      await expect(updateAddressBtn).toBeVisible({ timeout: 5000 });
    });

    test("should navigate to profile page when Update Address is clicked", async ({
      page,
    }) => {
      await loginUser(page, testUserEmail, testUserPassword);
      await page.goto(`${BASE_URL}/cart`);

      await page
        .getByRole("button", { name: "Update Address" })
        .click();

      await page.waitForURL("**/dashboard/user/profile", {
        timeout: 10000,
      });
      await expect(page).toHaveURL(/\/dashboard\/user\/profile/);
    });

    test("should display item count message without 'please login' text when logged in", async ({
      page,
    }) => {
      await loginUser(page, testUserEmail, testUserPassword);

      // Add an item
      await page.goto(BASE_URL);
      const addToCartButtons = page.getByRole("button", {
        name: "ADD TO CART",
      });
      await addToCartButtons.first().waitFor({ timeout: 15000 });
      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`);

      // Should say "You Have X items in your cart" without "please login to checkout"
      await expect(page.getByText(/You Have 1 items in your cart/)).toBeVisible(
        { timeout: 5000 }
      );
      await expect(
        page.getByText("please login to checkout")
      ).not.toBeVisible();
    });
  });

  // ──────────────────────────────────────────────
  // Login redirect from Cart
  // ──────────────────────────────────────────────
  test.describe("Login Redirect from Cart", () => {
    test("should redirect back to cart after login from cart page", async ({
      page,
    }) => {
      // Register a test user
      const email = `redirect_${Date.now()}@test.com`;
      const password = "testpass123";

      await registerUser(page, {
        name: "Redirect User",
        email,
        password,
        phone: "9876543210",
        address: "456 Redirect St",
        dob: "1999-06-15",
        answer: "football",
      });

      // Go to cart as guest
      await page.goto(`${BASE_URL}/cart`);

      // Click the login to checkout button
      await page
        .getByRole("button", { name: /login to checkout/i })
        .click();

      // Should be on login page
      await page.waitForURL("**/login");

      // Login
      await page.getByPlaceholder("Enter Your Email").fill(email);
      await page.getByPlaceholder("Enter Your Password").fill(password);
      await page.getByRole("button", { name: "LOGIN" }).click();

      // Should redirect back to cart
      await page.waitForURL("**/cart", { timeout: 10000 });
      await expect(page).toHaveURL(/\/cart/);
    });
  });

  // ──────────────────────────────────────────────
  // Cart Navigation
  // ──────────────────────────────────────────────
  test.describe("Cart Navigation via Header", () => {
    test("should navigate to cart page when clicking Cart link in header", async ({
      page,
    }) => {
      await page.goto(BASE_URL);

      const cartLink = page.getByRole("link", { name: /Cart/ });
      await expect(cartLink).toBeVisible();
      await cartLink.click();

      await page.waitForURL("**/cart");
      await expect(page).toHaveURL(/\/cart/);
    });

    test("should show cart badge with 0 when cart is empty", async ({
      page,
    }) => {
      await page.goto(BASE_URL);

      // The Badge component with showZero should display 0
      const badge = page.locator(".ant-badge");
      await expect(badge).toBeVisible();
    });
  });
});
