//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

// @ts-check
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("404 Page Not Found - E2E UI Tests", () => {

  test.describe("404 Page Content", () => {

    //Aashim Mahindroo, A0265890R
    test("should display 404 heading for a non-existent route", async ({ page }) => {
      await page.goto(`${BASE_URL}/this-page-does-not-exist`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display 'Oops ! Page Not Found' message", async ({ page }) => {
      await page.goto(`${BASE_URL}/no-such-page`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Oops ! Page Not Found")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display a 'Go Back' link", async ({ page }) => {
      await page.goto(`${BASE_URL}/random-nonexistent-path`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: "Go Back" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should display all three elements together: 404 heading, Oops message, and Go Back link", async ({ page }) => {
      await page.goto(`${BASE_URL}/definitely-not-found`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await expect(page.getByText("Oops ! Page Not Found")).toBeVisible();
      await expect(page.getByRole("link", { name: "Go Back" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should have the correct page title containing 'page not found'", async ({ page }) => {
      await page.goto(`${BASE_URL}/unknown-route-xyz`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveTitle(/page not found/i);
    });

  });

  test.describe("404 Page Navigation", () => {

    //Aashim Mahindroo, A0265890R
    test("should navigate back to the home page when clicking 'Go Back'", async ({ page }) => {
      await page.goto(`${BASE_URL}/missing-page-go-back-test`, { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "Go Back" }).click();
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(`${BASE_URL}/`);
    });

    //Aashim Mahindroo, A0265890R
    test("should render 404 for deeply nested non-existent paths", async ({ page }) => {
      await page.goto(`${BASE_URL}/a/b/c/d/e`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await expect(page.getByText("Oops ! Page Not Found")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should render 404 for paths that resemble valid routes but do not match exactly", async ({ page }) => {
      await page.goto(`${BASE_URL}/product`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should return to full home page content after navigating back with Go Back", async ({ page }) => {
      await page.goto(`${BASE_URL}/this-does-not-exist`, { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: "Go Back" }).click();
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000, waitUntil: "domcontentloaded" });
      // After going back, the home page should render with the Virtual Vault brand link
      await expect(page.getByRole("link", { name: /Virtual Vault/i })).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe("404 Page Layout Integration", () => {

    //Aashim Mahindroo, A0265890R
    test("should render the site header (navbar) on the 404 page", async ({ page }) => {
      await page.goto(`${BASE_URL}/page-not-here`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("nav.navbar")).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should render the site footer on the 404 page", async ({ page }) => {
      await page.goto(`${BASE_URL}/page-not-here`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/All Rights Reserved/i)).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should show the brand logo/link in the navbar on the 404 page", async ({ page }) => {
      await page.goto(`${BASE_URL}/truly-not-found`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: /Virtual Vault/i })).toBeVisible();
    });

    //Aashim Mahindroo, A0265890R
    test("should allow navigation to home page by clicking the brand logo on the 404 page", async ({ page }) => {
      await page.goto(`${BASE_URL}/truly-not-found`, { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: /Virtual Vault/i }).click();
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000, waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(`${BASE_URL}/`);
    });

  });

});
