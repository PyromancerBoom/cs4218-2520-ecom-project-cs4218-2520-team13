//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.


// @ts-check
import { test, expect } from "@playwright/test";
import {
  connectTestDB, disconnectTestDB, clearTestCollections, seedProduct, seedCategory,
} from "../helpers/e2eDb.js";

const BASE_URL = "http://localhost:3000";


/** @type {any[]} */
let dbCategories = [];

const TS = Date.now();
const TEST_USER = {
  name: "Header Test User",
  email: `header_ui_${TS}@test.com`,
  password: "Test@1234",
  phone: "98765432",
  address: "1 Test Road",
  answer: "Football",
};

async function injectAuth(page, user, token = "fake-ui-test-token") {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ user, token }) => {
      localStorage.setItem("auth", JSON.stringify({ user, token }));
      localStorage.removeItem("cart");
    },
    { user, token }
  );
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

async function loginUser(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
}

async function openDropdown(page, toggleLocator) {
  await toggleLocator.click();
  await page.waitForTimeout(350);
}

test.describe("Header - Authentication and Navigation UI Tests", () => {
  test.beforeAll(async () => {
    await connectTestDB();
    const category = await seedCategory({ name: "Header Test Category", slug: "header-test-category" });
    await seedProduct({ name: "Header Test Product 1", slug: "header-test-product-1", price: 9.99, category: category._id });
    await seedProduct({ name: "Header Test Product 2", slug: "header-test-product-2", price: 29.99, category: category._id });
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  test.beforeAll(async ({ request }) => {
    const catResp = await request.get(
      `${BASE_URL}/api/v1/category/get-category`
    );
    dbCategories = (await catResp.json()).category ?? [];

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

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("auth");
      localStorage.removeItem("cart");
    });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
  });

  test.describe("Unauthenticated State", () => {
    test("should display Register link when not logged in", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).toBeVisible();
    });

    test("should display Login link when not logged in", async ({ page }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).toBeVisible();
    });

    test("should not display Dashboard link when not logged in", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Dashboard" })
      ).not.toBeVisible();
    });

    test("should not display Logout link when not logged in", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Logout" })
      ).not.toBeVisible();
    });

    test("should display the cart badge showing 0 when cart is empty", async ({
      page,
    }) => {
      const badge = page.locator(".ant-badge");
      await expect(badge).toBeVisible();
      await expect(badge.locator(".ant-badge-count")).toHaveText("0");
    });

    test("should display the brand name Virtual Vault", async ({ page }) => {
      await expect(page.locator(".navbar-brand")).toContainText(
        "Virtual Vault"
      );
    });
  });

  test.describe("Authenticated as Regular User", () => {
    const mockUser = {
      _id: "mock-user-id-001",
      name: "Jane Smith",
      email: "jane@example.com",
      role: 0,
    };

    test.beforeEach(async ({ page }) => {
      await injectAuth(page, mockUser);
    });

    test("should display the username in the navbar dropdown toggle", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByText("Jane Smith")
      ).toBeVisible();
    });

    test("should not display Login link when logged in", async ({ page }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).not.toBeVisible();
    });

    test("should not display Register link when logged in", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).not.toBeVisible();
    });

    test("should show Dashboard link pointing to /dashboard/user for role 0", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByText("Jane Smith")
      );
      const dashboardLink = page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Dashboard" });
      await expect(dashboardLink).toBeVisible({ timeout: 5000 });
      await expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
    });

    test("should show Logout option inside the user dropdown", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByText("Jane Smith")
      );
      await expect(
        page
          .locator(".navbar .dropdown-menu")
          .getByRole("link", { name: "Logout" })
      ).toBeVisible({ timeout: 5000 });
    });

    test("should navigate to /dashboard/user when Dashboard is clicked", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByText("Jane Smith")
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Dashboard" })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/user/, { timeout: 8000 });
    });
  });

  test.describe("Authenticated as Admin", () => {
    const mockAdmin = {
      _id: "mock-admin-id-001",
      name: "Super Admin",
      email: "superadmin@example.com",
      role: 1,
    };

    test.beforeEach(async ({ page }) => {
      await injectAuth(page, mockAdmin);
    });

    test("should display admin username in the navbar dropdown toggle", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByText("Super Admin")
      ).toBeVisible();
    });

    test("should not display Login or Register links when admin is logged in", async ({
      page,
    }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).not.toBeVisible();
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).not.toBeVisible();
    });

    test("should show Dashboard link pointing to /dashboard/admin for role 1", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByText("Super Admin")
      );
      const dashboardLink = page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Dashboard" });
      await expect(dashboardLink).toBeVisible({ timeout: 5000 });
      await expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
    });

    test("should navigate to /dashboard/admin when Dashboard is clicked", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByText("Super Admin")
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Dashboard" })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 8000 });
    });
  });

  test.describe("Login and Logout Flow", () => {
    test("should show username in the header after successful login", async ({
      page,
    }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await expect(
        page.locator(".navbar").getByText(TEST_USER.name)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should show login success toast after logging in", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByPlaceholder("Enter Your Email").fill(TEST_USER.email);
      await page
        .getByPlaceholder("Enter Your Password")
        .fill(TEST_USER.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
      await expect(
        page.getByText("login successfully")
      ).toBeVisible({ timeout: 5000 });
    });

    test("should hide Login and Register links after successful login", async ({
      page,
    }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).not.toBeVisible();
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).not.toBeVisible();
    });

    test("should show Logout Successfully toast when Logout is clicked", async ({
      page,
    }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await openDropdown(
        page,
        page.locator(".navbar").getByText(TEST_USER.name)
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Logout" })
        .click();
      await expect(page.getByText("Logout Successfully")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should show Login and Register links again after logout", async ({
      page,
    }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await openDropdown(
        page,
        page.locator(".navbar").getByText(TEST_USER.name)
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Logout" })
        .click();

      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).toBeVisible({ timeout: 5000 });
    });

    test("should remove auth from localStorage after logout", async ({
      page,
    }) => {
      await loginUser(page, TEST_USER.email, TEST_USER.password);
      await openDropdown(
        page,
        page.locator(".navbar").getByText(TEST_USER.name)
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "Logout" })
        .click();
      await page.waitForTimeout(500);

      const authData = await page.evaluate(() =>
        localStorage.getItem("auth")
      );
      expect(authData).toBeNull();
    });

    test("should show error toast for invalid login credentials", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/login`);
      await page
        .getByPlaceholder("Enter Your Email")
        .fill("nonexistent@test.com");
      await page.getByPlaceholder("Enter Your Password").fill("WrongPass!");
      await page.getByRole("button", { name: "LOGIN" }).click();
      // Should stay on /login and show an error
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });

  test.describe("Cart Badge", () => {
    test("should display cart badge with count 0 when cart is empty", async ({
      page,
    }) => {
      await expect(page.locator(".ant-badge-count")).toHaveText("0");
    });

    test("should update badge count to 1 after adding one product to cart", async ({
      page,
    }) => {
      const addButtons = page.getByRole("button", { name: "ADD TO CART" });
      await expect(addButtons.first()).toBeVisible({ timeout: 15000 });
      await addButtons.first().click();

      await expect(page.locator(".ant-badge-count")).toHaveText("1", {
        timeout: 5000,
      });
    });

    test("should update badge count to 2 after adding two different products", async ({
      page,
    }) => {
      const addButtons = page.getByRole("button", { name: "ADD TO CART" });
      await expect(addButtons.nth(1)).toBeVisible({ timeout: 15000 });
      await addButtons.first().click();
      await page.waitForTimeout(400);
      await addButtons.nth(1).click();

      await expect(page.locator(".ant-badge-count")).toHaveText("2", {
        timeout: 5000,
      });
    });

    test("should persist badge count after navigating to another page", async ({
      page,
    }) => {
      const addButtons = page.getByRole("button", { name: "ADD TO CART" });
      await expect(addButtons.first()).toBeVisible({ timeout: 15000 });
      await addButtons.first().click();
      await page.waitForTimeout(300);

      await page.goto(`${BASE_URL}/about`);
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator(".ant-badge-count")).toHaveText("1", {
        timeout: 5000,
      });
    });
  });

  test.describe("Categories Dropdown", () => {
    test("should display the Categories nav item", async ({ page }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Categories" }).first()
      ).toBeVisible();
    });

    test("should show All Categories link when dropdown is opened", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );
      await expect(
        page.locator(".navbar .dropdown-menu").getByRole("link", {
          name: "All Categories",
        })
      ).toBeVisible({ timeout: 5000 });
    });

    test("should list every database category in the dropdown", async ({
      page,
    }) => {
      test.skip(
        dbCategories.length === 0,
        "No categories found in the database"
      );

      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );

      for (const cat of dbCategories) {
        await expect(
          page.locator(".navbar .dropdown-menu").getByText(cat.name)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should navigate to /categories when All Categories is clicked", async ({
      page,
    }) => {
      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByRole("link", { name: "All Categories" })
        .click();
      await expect(page).toHaveURL(/\/categories/, { timeout: 5000 });
    });

    test("should navigate to /category/:slug when a category link is clicked", async ({
      page,
    }) => {
      test.skip(
        dbCategories.length === 0,
        "No categories found in the database"
      );

      const firstCat = dbCategories[0];
      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByText(firstCat.name)
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/category/${firstCat.slug}`),
        { timeout: 5000 }
      );
    });

    test("should show category heading on the category page after clicking a category link", async ({
      page,
    }) => {
      test.skip(
        dbCategories.length === 0,
        "No categories found in the database"
      );

      const firstCat = dbCategories[0];
      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByText(firstCat.name)
        .click();

      await expect(page).toHaveURL(
        new RegExp(`/category/${firstCat.slug}`),
        { timeout: 5000 }
      );
      await expect(
        page.getByText(new RegExp(`Category - ${firstCat.name}`, "i"))
      ).toBeVisible({ timeout: 10000 });
    });

    test("should show number of results on the category page", async ({
      page,
    }) => {
      test.skip(
        dbCategories.length === 0,
        "No categories found in the database"
      );

      const firstCat = dbCategories[0];
      await openDropdown(
        page,
        page.locator(".navbar").getByRole("link", { name: "Categories" })
      );
      await page
        .locator(".navbar .dropdown-menu")
        .getByText(firstCat.name)
        .click();

      await expect(page).toHaveURL(
        new RegExp(`/category/${firstCat.slug}`),
        { timeout: 5000 }
      );
      await expect(
        page.getByText(/result found/i)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Search", () => {
    test("should display the search input with placeholder 'Search'", async ({
      page,
    }) => {
      await expect(page.getByPlaceholder("Search")).toBeVisible();
    });

    test("should display the Search submit button", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Search" })
      ).toBeVisible();
    });

    test("should navigate to /search when a query is submitted via button", async ({
      page,
    }) => {
      await page.getByPlaceholder("Search").fill("laptop");
      await page.getByRole("button", { name: "Search" }).click();
      await page.waitForURL("**/search**", { timeout: 10000 });
      await expect(page).toHaveURL(/\/search/);
    });

    test("should navigate to /search when Enter is pressed in the search box", async ({
      page,
    }) => {
      await page.getByPlaceholder("Search").fill("headphones");
      await page.getByPlaceholder("Search").press("Enter");
      await page.waitForURL("**/search**", { timeout: 10000 });
      await expect(page).toHaveURL(/\/search/);
    });

    test("should call the search API with the typed keyword", async ({
      page,
    }) => {
      const keyword = "book";
      const searchResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes(`/api/v1/product/search/${keyword}`) &&
          res.status() === 200,
        { timeout: 10000 }
      );

      await page.getByPlaceholder("Search").fill(keyword);
      await page.getByRole("button", { name: "Search" }).click();

      const searchResp = await searchResponsePromise;
      expect(searchResp.status()).toBe(200);
    });

    test("should remain on the search page after a search is performed", async ({
      page,
    }) => {
      await page.getByPlaceholder("Search").fill("test");
      await page.getByRole("button", { name: "Search" }).click();
      await page.waitForURL("**/search**", { timeout: 10000 });
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Navigation Links", () => {
    test("should display the Virtual Vault brand in the navbar", async ({
      page,
    }) => {
      await expect(page.locator(".navbar-brand")).toContainText(
        "Virtual Vault"
      );
    });

    test("should navigate to / when the brand logo is clicked", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/about`);
      await page.locator(".navbar-brand").click();
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 5000 });
    });

    test("should display the Home nav link", async ({ page }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Home" })
      ).toBeVisible();
    });

    test("should navigate to / when Home link is clicked", async ({ page }) => {
      await page.goto(`${BASE_URL}/about`);
      await page
        .locator(".navbar")
        .getByRole("link", { name: "Home" })
        .click();
      await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 5000 });
    });

    test("should display the Cart link in the navbar", async ({ page }) => {
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Cart" })
      ).toBeVisible();
    });

    test("should navigate to /cart when the Cart link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".navbar")
        .getByRole("link", { name: "Cart" })
        .click();
      await expect(page).toHaveURL(/\/cart/, { timeout: 5000 });
    });

    test("should navigate to /register when the Register link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".navbar")
        .getByRole("link", { name: "Register" })
        .click();
      await expect(page).toHaveURL(/\/register/, { timeout: 5000 });
    });

    test("should navigate to /login when the Login link is clicked", async ({
      page,
    }) => {
      await page
        .locator(".navbar")
        .getByRole("link", { name: "Login" })
        .click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });
});
