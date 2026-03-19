//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

// @ts-check
import { test, expect } from "@playwright/test";
import {
  connectTestDB, disconnectTestDB, clearTestCollections, seedProduct,
} from "../helpers/e2eDb.js";

const BASE_URL = "http://localhost:3000";

const TS = Date.now();

const TEST_USER = {
  name: "Checkout Test User",
  email: `checkout_ui_${TS}@test.com`,
  password: "Test@1234",
  phone: "91234567",
  address: "10 Checkout Street",
  answer: "Football",
};


async function registerUser(page, userData) {
  await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Name").fill(userData.name);
  await page.getByPlaceholder("Enter Your Email").fill(userData.email);
  await page.getByPlaceholder("Enter Your Password").fill(userData.password);
  await page.getByPlaceholder("Enter Your Phone").fill(userData.phone);
  await page.getByPlaceholder("Enter Your Address").fill(userData.address);
  await page.getByPlaceholder("What is Your Favorite sports").fill(userData.answer);
  await page.getByRole("button", { name: "REGISTER" }).click();
  await page.waitForURL("**/login", { timeout: 10000, waitUntil: "domcontentloaded" });
}

async function loginUser(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
    waitUntil: "domcontentloaded",
  });
}

async function addFirstProductToCart(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  const addToCartButtons = page.getByRole("button", { name: "ADD TO CART" });
  await addToCartButtons.first().waitFor({ timeout: 15000 });
  await addToCartButtons.first().click();
  await page.waitForTimeout(500);
}


test.describe("Checkout and Payment Flow - E2E UI Tests", () => {

  test.beforeAll(async () => {
    await connectTestDB();
    await seedProduct({ name: "Checkout Test Product 1", slug: "checkout-test-product-1", price: 9.99 });
    await seedProduct({ name: "Checkout Test Product 2", slug: "checkout-test-product-2", price: 19.99 });
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE_URL}/api/v1/auth/register`, {
      data: {
        name: TEST_USER.name,
        email: TEST_USER.email,
        password: TEST_USER.password,
        phone: TEST_USER.phone,
        address: TEST_USER.address,
        answer: TEST_USER.answer,
      },
    });
  });


  test.describe("Guest User Checkout Section", () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
    });

    //Aashim Mahindroo, A0265890R
    test("should show Cart Summary section for guest user", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Cart Summary")).toBeVisible();
      await expect(page.getByText("Total | Checkout | Payment")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'Your Cart Is Empty' for a guest with no items", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'Plase Login to checkout' button for guest user", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: /login to checkout/i })
      ).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should redirect to /login when guest clicks 'Plase Login to checkout'", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /login to checkout/i }).click();
      await page.waitForURL("**/login", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    });

    //Aashim Mahindroo, A0265890R
    test("should not show the payment section (DropIn) for a guest user", async ({ page }) => {
      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-token" }) })
      );
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      await expect(page.getByRole("button", { name: "Make Payment" })).not.toBeVisible();
    });

  });


  test.describe("Logged-in User Cart and Checkout", () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
      await loginUser(page, TEST_USER.email, TEST_USER.password);
    });

    //Aashim Mahindroo, A0265890R
    test("should greet the logged-in user by name on the cart page", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Hello\s+Checkout Test User/)).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should show item count message for logged-in user with items in cart", async ({ page }) => {
      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/You Have 1 items in your cart/)).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should display cart item name and price after adding a product", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      const addToCartButtons = page.getByRole("button", { name: "ADD TO CART" });
      await addToCartButtons.first().waitFor({ timeout: 15000 });

      const firstCard = page.locator(".card").first();
      const productName = (await firstCard.locator("h5.card-title").first().textContent()) ?? "";

      await addToCartButtons.first().click();
      await page.waitForTimeout(500);

      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      if (productName.trim()) {
        await expect(page.getByText(productName.trim(), { exact: true }).first()).toBeVisible({ timeout: 5000 });
      }
      await expect(page.locator("text=Price :").first()).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display the total price in the Cart Summary", async ({ page }) => {
      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/Total\s*:\s*\$/).first()).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should remove an item from cart when the Remove button is clicked", async ({ page }) => {
      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/You Have 1 items in your cart/)).toBeVisible({ timeout: 5000 });

      await page.getByRole("button", { name: "Remove" }).first().click();
      await page.waitForTimeout(500);

      await expect(page.getByText("Your Cart Is Empty")).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'Current Address' section for a user who has an address set", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Current Address")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("10 Checkout Street")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'Update Address' button for a logged-in user", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: "Update Address" })
      ).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should navigate to /dashboard/user/profile when Update Address is clicked", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Update Address" }).click();
      await page.waitForURL("**/dashboard/user/profile", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard\/user\/profile/);
    });

    //Aashim Mahindroo, A0265890R
    test("should not show 'please login to checkout' text for logged-in user", async ({ page }) => {
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/please login to checkout/i)).not.toBeVisible();
    });

  });


  test.describe("Payment Section Visibility", () => {

    //Aashim Mahindroo, A0265890R
    test("should not show payment section when cart is empty (even when logged in)", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-token" }) })
      );

      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      await expect(page.getByRole("button", { name: "Make Payment" })).not.toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should render the payment section (Make Payment button) when user is logged in, has cart items, and a client token is available", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-client-token-for-test" }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      await expect(page.getByRole("button", { name: "Make Payment" })).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should have 'Make Payment' button disabled before DropIn initializes (no real Braintree token)", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "non-functional-fake-token" }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const makePaymentBtn = page.getByRole("button", { name: "Make Payment" });
      await expect(makePaymentBtn).toBeVisible({ timeout: 8000 });
      await expect(makePaymentBtn).toBeDisabled();
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'Processing ....' text on Make Payment button when loading", async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("cart"));
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-client-token" }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const makePaymentBtn = page.getByRole("button", { name: "Make Payment" });
      await expect(makePaymentBtn).toBeVisible({ timeout: 8000 });
      await expect(page.getByText("Processing ....")).not.toBeVisible();
    });

  });


  test.describe("Complete Payment Flow Simulation", () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        localStorage.removeItem("cart");
        localStorage.removeItem("auth");
      });
    });

    //Aashim Mahindroo, A0265890R
    test("should clear the cart from localStorage after a successful payment", async ({ page }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-token" }) })
      );

      await page.route("**/api/v1/product/braintree/payment", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      await page.evaluate(async () => {
        const authRaw = localStorage.getItem("auth");
        const auth = authRaw ? JSON.parse(authRaw) : {};
        const cartRaw = localStorage.getItem("cart");
        const cart = cartRaw ? JSON.parse(cartRaw) : [];

        await fetch("/api/v1/product/braintree/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth?.token ?? "",
          },
          body: JSON.stringify({ nonce: "fake-nonce", cart }),
        });

        localStorage.removeItem("cart");
      });

      const cartAfter = await page.evaluate(() => localStorage.getItem("cart"));
      expect(cartAfter).toBeNull();
    });

    //Aashim Mahindroo, A0265890R
    test("should redirect to /dashboard/user/orders after successful payment", async ({ page }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-token" }) })
      );
      await page.route("**/api/v1/product/braintree/payment", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      await page.evaluate(async () => {
        const authRaw = localStorage.getItem("auth");
        const auth = authRaw ? JSON.parse(authRaw) : {};
        const cartRaw = localStorage.getItem("cart");
        const cart = cartRaw ? JSON.parse(cartRaw) : [];

        await fetch("/api/v1/product/braintree/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth?.token ?? "",
          },
          body: JSON.stringify({ nonce: "fake-nonce", cart }),
        });

        localStorage.removeItem("cart");
        window.location.href = "/dashboard/user/orders";
      });

      await page.waitForURL("**/dashboard/user/orders", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard\/user\/orders/);
    });

    //Aashim Mahindroo, A0265890R
    test("should show 'All Orders' heading on the orders page after payment", async ({ page }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await page.route("**/api/v1/product/braintree/token", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ clientToken: "fake-token" }) })
      );
      await page.route("**/api/v1/product/braintree/payment", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
      );

      await addFirstProductToCart(page);
      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      await page.evaluate(async () => {
        const authRaw = localStorage.getItem("auth");
        const auth = authRaw ? JSON.parse(authRaw) : {};
        const cartRaw = localStorage.getItem("cart");
        const cart = cartRaw ? JSON.parse(cartRaw) : [];

        await fetch("/api/v1/product/braintree/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth?.token ?? "",
          },
          body: JSON.stringify({ nonce: "fake-nonce", cart }),
        });

        localStorage.removeItem("cart");
        window.location.href = "/dashboard/user/orders";
      });

      await page.waitForURL("**/dashboard/user/orders", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should show the UserMenu sidebar on the orders page after payment", async ({ page }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await page.goto(`${BASE_URL}/dashboard/user/orders`, { waitUntil: "domcontentloaded" });
      // UserMenu contains a "Profile" link
      await expect(page.getByRole("link", { name: /Profile/i })).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should have an empty cart in the header badge after payment clears the cart", async ({ page }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);

      await addFirstProductToCart(page);

      await page.evaluate(() => localStorage.removeItem("cart"));

      await page.goto(`${BASE_URL}/cart`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Your Cart Is Empty")).toBeVisible({ timeout: 5000 });
    });

  });

});
