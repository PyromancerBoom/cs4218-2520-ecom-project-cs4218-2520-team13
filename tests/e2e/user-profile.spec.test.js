// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("User Profile Management - Integration Suite", () => {
    // Using more robust selectors based on your call log
    const phoneSelector = 'input[placeholder*="Phone"]';
    const addressSelector = 'input[placeholder*="Address"]';
    const nameSelector = 'input[placeholder*="Name"]';
    const emailSelector = 'input[placeholder*="Email"]';
    const passwordSelector = 'input[placeholder*="Password"]';

    let originalPhone = "81234567";
    let originalAddress = "1 Computing Drive";

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('cs4218@test.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('cs4218@test.com');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Ensure login is successful by waiting for the specific user menu
        await page.getByRole('button', { name: 'CS 4218 Test Account', exact: false }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Profile' }).click();
        await expect(page).toHaveURL(/.*profile/);
    });

    test("Happy Path: Update and Persistent Check", async ({ page }) => {
        const testPhone = "812345678";
        const testAddress = "1 Computing Drives";

        await page.locator(phoneSelector).fill(testPhone);
        await page.locator(addressSelector).fill(testAddress);

        // CRITICAL: Wait for the actual API call to complete before reloading
        const responsePromise = page.waitForResponse(resp =>
            resp.url().includes('/api/v1/auth/profile') && resp.status() === 200
        );
        await page.getByRole('button', { name: 'UPDATE' }).click();
        await responsePromise;

        // Give the backend a tiny bit of breathing room or wait for the toast
        await expect(page.locator('body')).toContainText(/updated|successfully/i);

        await page.reload();
        // Wait for the inputs to be populated with data from the server
        await expect(page.locator(phoneSelector)).toHaveValue(testPhone, { timeout: 10000 });
        await expect(page.locator(addressSelector)).toHaveValue(testAddress, { timeout: 10000 });

        // Revert to keep DB clean
        await page.locator(phoneSelector).fill(originalPhone);
        await page.locator(addressSelector).fill(originalAddress);
        await page.getByRole('button', { name: 'UPDATE' }).click();
    });

    test("Edge Case: Mandatory Name", async ({ page }) => {
        await page.locator(nameSelector).clear();
        await page.getByRole('button', { name: 'UPDATE' }).click();
        await expect(page.getByText(/name is required/i)).toBeVisible();
    });

    test("Security: Constrained Fields", async ({ page }) => {
        // Try multiple ways to find the email input if placeholder fails
        const emailInput = page.locator('input[type="email"]').first();

        await expect(emailInput).not.toBeEditable();
        await expect(emailInput).toHaveValue('cs4218@test.com');

        const passwordInput = page.locator(passwordSelector);
        await expect(passwordInput).toHaveValue('');
    });
});