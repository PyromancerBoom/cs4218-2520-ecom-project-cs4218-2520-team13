//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const TS = Date.now();

const TEST_USER = {
  name: "Auth Test User",
  email: `auth_ui_${TS}@test.com`,
  password: "Test@1234",
  phone: "91234567",
  address: "10 Auth Street",
  dob: "2000-01-01",
  answer: "Football",
};

async function fillRegisterForm(page, userData) {
  await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Name").fill(userData.name);
  await page.getByPlaceholder("Enter Your Email ").fill(userData.email);
  await page.getByPlaceholder("Enter Your Password").fill(userData.password);
  await page.getByPlaceholder("Enter Your Phone").fill(userData.phone);
  await page.getByPlaceholder("Enter Your Address").fill(userData.address);
  await page.getByPlaceholder("Enter Your DOB").fill(userData.dob);
  await page.getByPlaceholder("What is Your Favorite sports").fill(userData.answer);
}

async function submitRegisterForm(page) {
  await page.getByRole("button", { name: "REGISTER" }).click();
}

async function fillLoginForm(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Enter Your Email ").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
}

async function submitLoginForm(page) {
  await page.getByRole("button", { name: "LOGIN" }).click();
}

test.describe("User Registration and Login Flow - E2E UI Tests", () => {

  test.describe("Registration Form", () => {
    //Aashim Mahindroo, A0265890R
    test("should display the register form with all required fields", async ({ page }) => {
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Email ")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Phone")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Address")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your DOB")).toBeVisible();
      await expect(page.getByPlaceholder("What is Your Favorite sports")).toBeVisible();
      await expect(page.getByRole("button", { name: "REGISTER" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display REGISTER FORM heading", async ({ page }) => {
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("REGISTER FORM")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should successfully register and redirect to /login", async ({ page }) => {
      await fillRegisterForm(page, TEST_USER);
      await submitRegisterForm(page);
      await page.waitForURL("**/login", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    });

    //Aashim Mahindroo, A0265890R
    test("should show success toast after successful registration", async ({ page }) => {
      const uniqueUser = { ...TEST_USER, email: `auth_toast_${TS}@test.com` };
      await fillRegisterForm(page, uniqueUser);
      await submitRegisterForm(page);
      await expect(
        page.getByText("Register Successfully, please login")
      ).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should show error toast when registering with a duplicate email", async ({ page }) => {
      const dupUser = { ...TEST_USER, email: `auth_dup_${TS}@test.com` };
      await fillRegisterForm(page, dupUser);
      await submitRegisterForm(page);
      await page.waitForURL("**/login", { timeout: 10000, waitUntil: "domcontentloaded" });

      await fillRegisterForm(page, dupUser);
      await submitRegisterForm(page);
      await expect(page).toHaveURL(/\/register/, { timeout: 5000 });
      await expect(page.getByText(/Already Register please login/i)).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should not submit form when required Name field is empty", async ({ page }) => {
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Enter Your Email ").fill(TEST_USER.email);
      await page.getByPlaceholder("Enter Your Password").fill(TEST_USER.password);
      await page.getByPlaceholder("Enter Your Phone").fill(TEST_USER.phone);
      await page.getByPlaceholder("Enter Your Address").fill(TEST_USER.address);
      await page.getByPlaceholder("Enter Your DOB").fill(TEST_USER.dob);
      await page.getByPlaceholder("What is Your Favorite sports").fill(TEST_USER.answer);
      await submitRegisterForm(page);
      await expect(page).toHaveURL(/\/register/);
    });

    //Aashim Mahindroo, A0265890R
    test("should not submit form when required Email field is empty", async ({ page }) => {
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Enter Your Name").fill(TEST_USER.name);
      await page.getByPlaceholder("Enter Your Password").fill(TEST_USER.password);
      await page.getByPlaceholder("Enter Your Phone").fill(TEST_USER.phone);
      await page.getByPlaceholder("Enter Your Address").fill(TEST_USER.address);
      await page.getByPlaceholder("Enter Your DOB").fill(TEST_USER.dob);
      await page.getByPlaceholder("What is Your Favorite sports").fill(TEST_USER.answer);
      await submitRegisterForm(page);
      await expect(page).toHaveURL(/\/register/);
    });

    //Aashim Mahindroo, A0265890R
    test("should not submit form when required Password field is empty", async ({ page }) => {
      await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Enter Your Name").fill(TEST_USER.name);
      await page.getByPlaceholder("Enter Your Email ").fill(TEST_USER.email);
      await page.getByPlaceholder("Enter Your Phone").fill(TEST_USER.phone);
      await page.getByPlaceholder("Enter Your Address").fill(TEST_USER.address);
      await page.getByPlaceholder("Enter Your DOB").fill(TEST_USER.dob);
      await page.getByPlaceholder("What is Your Favorite sports").fill(TEST_USER.answer);
      await submitRegisterForm(page);
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe("Login Form", () => {
    test.beforeAll(async ({ request }) => {
      await request.post(`${BASE_URL}/api/v1/auth/register`, {
        data: {
          name: TEST_USER.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
          phone: TEST_USER.phone,
          address: TEST_USER.address,
          DOB: TEST_USER.dob,
          answer: TEST_USER.answer,
        },
      });
    });

    //Aashim Mahindroo, A0265890R
    test("should display the login form with email, password fields and LOGIN button", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await expect(page.getByPlaceholder("Enter Your Email ")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display LOGIN FORM heading", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("LOGIN FORM")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display Forgot Password button", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: "Forgot Password" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should navigate to /forgot-password when Forgot Password is clicked", async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Forgot Password" }).click();
      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should successfully login and redirect to home page", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).not.toHaveURL(/\/login/);
    });

    //Aashim Mahindroo, A0265890R
    test("should show login success toast after successful login", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" }).catch(() => {});
      await expect(page.getByText("login successfully")).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should store auth data in localStorage after login", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });

      const authData = await page.evaluate(() => localStorage.getItem("auth"));
      expect(authData).not.toBeNull();
      const parsed = JSON.parse(authData ?? "{}");
      expect(parsed).toHaveProperty("token");
      expect(parsed).toHaveProperty("user");
    });

    //Aashim Mahindroo, A0265890R
    test("should show username in navbar after login", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
      await expect(
        page.locator(".navbar").getByText(TEST_USER.name)
      ).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should hide Login and Register links in navbar after login", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).not.toBeVisible();
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).not.toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should stay on /login and show error toast for invalid credentials", async ({ page }) => {
      await fillLoginForm(page, "nonexistent@test.com", "WrongPass999!");
      await submitLoginForm(page);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
      await expect(page.getByText(/Something went wrong|Invalid|wrong/i)).toBeVisible({ timeout: 8000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should stay on /login and show error toast for wrong password", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, "WrongPassword999!");
      await submitLoginForm(page);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });

  test.describe("Full Registration and Login Flow", () => {
    //Aashim Mahindroo, A0265890R
    test("should register a new user and then login successfully", async ({ page }) => {
      const flowUser = {
        ...TEST_USER,
        email: `auth_flow_${TS}@test.com`,
        name: "Flow Test User",
      };

      await fillRegisterForm(page, flowUser);
      await submitRegisterForm(page);
      await page.waitForURL("**/login", { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);

      await page.getByPlaceholder("Enter Your Email ").fill(flowUser.email);
      await page.getByPlaceholder("Enter Your Password").fill(flowUser.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });

      await expect(page.locator(".navbar").getByText(flowUser.name)).toBeVisible({ timeout: 5000 });
    });

    //Aashim Mahindroo, A0265890R
    test("should clear auth from localStorage after logout", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });

      await page.locator(".navbar").getByText(TEST_USER.name).click();
      await page.waitForTimeout(350);
      await page.locator(".navbar .dropdown-menu").getByRole("link", { name: "Logout" }).click();
      await page.waitForTimeout(500);

      const authData = await page.evaluate(() => localStorage.getItem("auth"));
      expect(authData).toBeNull();
    });

    //Aashim Mahindroo, A0265890R
    test("should show Login and Register links in navbar after logout", async ({ page }) => {
      await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
      await submitLoginForm(page);
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000, waitUntil: "domcontentloaded" });

      await page.locator(".navbar").getByText(TEST_USER.name).click();
      await page.waitForTimeout(350);
      await page.locator(".navbar .dropdown-menu").getByRole("link", { name: "Logout" }).click();

      await expect(
        page.locator(".navbar").getByRole("link", { name: "Login" })
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.locator(".navbar").getByRole("link", { name: "Register" })
      ).toBeVisible({ timeout: 5000 });
    });
  });
});
