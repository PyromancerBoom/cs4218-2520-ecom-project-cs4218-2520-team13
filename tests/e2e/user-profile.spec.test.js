//A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("User Profile Management - Real Flow with Mocked API", () => {
    // Selectors from your working integration test
    const phoneSelector = 'input[placeholder*="Phone"]';
    const nameSelector = 'input[placeholder*="Name"]';

    const mockUser = {
        _id: "60d5ec49f1b2c81108e523a1",
        name: "Sandra",
        email: "cs4218@test.com",
        phone: "81234567",
        address: "1 Computing Drive",
        role: 0
    };

    test.beforeEach(async ({ page }) => {
        // 1. Mock Login
        await page.route('**/api/v1/auth/login', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, user: mockUser, token: 'mock-token' }),
            });
        });

        // 2. Mock User Auth Check (CRITICAL: Dashboard often waits for this)
        await page.route('**/api/v1/auth/user-auth', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });

        // 3. Mock Profile (GET and PUT)
        await page.route('**/api/v1/auth/profile', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, user: mockUser })
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        message: "Profile Updated Successfully",
                        updatedUser: { ...mockUser, phone: "812345678" }
                    }),
                });
            }
        });

        // --- Execution Flow ---
        await page.goto(BASE_URL);

        // Ensure localStorage is set before any action
        await page.addInitScript((data) => {
            window.localStorage.setItem('auth', JSON.stringify({ user: data, token: 'mock-token' }));
        }, mockUser);

        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: /Email/i }).fill('cs4218@test.com');
        await page.getByRole('textbox', { name: /Password/i }).fill('cs4218@test.com');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Navigate to Dashboard
        await page.getByRole('button', { name: 'Sandra', exact: false }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();

        // Use waitForURL to ensure navigation is finished
        await page.waitForURL('**/dashboard/user**');

        // Robust selector for Profile link in sidebar
        const profileLink = page.locator('.list-group, .col-md-3').getByRole('link', { name: 'Profile' });
        await expect(profileLink).toBeAttached({ timeout: 15000 });
        await profileLink.click({ force: true });

        await expect(page).toHaveURL(/.*profile/);
    });

    test("Happy Path: Update and Persistent Check", async ({ page }) => {
        await page.locator(phoneSelector).fill("812345678");
        await page.getByRole('button', { name: 'UPDATE' }).click({ force: true });
        await expect(page.locator('body')).toContainText(/updated|successfully/i);
    });

    test("Edge Case: Mandatory Name", async ({ page }) => {
        await page.locator(nameSelector).clear();
        await page.getByRole('button', { name: 'UPDATE' }).click({ force: true });
        await expect(page.locator('body')).toContainText(/name is required/i);
    });

    test("Security: Constrained Fields", async ({ page }) => {
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).not.toBeEditable();
        await expect(emailInput).toHaveValue('cs4218@test.com');
    });
});