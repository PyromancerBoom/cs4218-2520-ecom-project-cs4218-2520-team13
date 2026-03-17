//  A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("Admin User Management - Real Flow with Mocked API", () => {

    test.beforeEach(async ({ page }) => {
        const mockAuth = {
            user: { name: 'Admin Sandra', email: 'admin@test.sg', role: 1 },
            token: 'mock-jwt-token'
        };

        await page.route('**/api/v1/auth/login', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    ...mockAuth
                }),
            });
        });

        await page.route('**/api/v1/auth/admin-auth', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
        });

        await page.route('**/api/v1/auth/all-users', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    users: [
                        { _id: '1', name: 'Admin Sandra', email: 'admin@test.sg', role: 1, phone: '1234', address: 'SG' },
                        { _id: '2', name: 'Normal User', email: 'user@test.com', role: 0, phone: '5678', address: 'TW' }
                    ]
                }),
            });
        });

        await page.goto(`${BASE_URL}/login`);

        // Key Fix: Manually set auth state to ensure front-end redirects correctly after click
        await page.addInitScript((data) => {
            window.localStorage.setItem('auth', JSON.stringify(data));
        }, mockAuth);

        await page.getByPlaceholder(/Enter Your Email/i).fill('admin@test.sg');
        await page.getByPlaceholder(/Enter Your Password/i).fill('password123');

        // This click triggers the handleLogin which should now see the 'auth' in storage
        await page.click('button:has-text("LOGIN")');

        // Instead of waitForURL which can be flaky with redirects, 
        // navigate directly to ensure we reach the target.
        await page.goto(`${BASE_URL}/dashboard/admin/users`);
    });

    test("User List Display & Structural Verification", async ({ page }) => {
        await expect(page.locator('h1')).toContainText('All Users List');
        const table = page.locator('table');
        await expect(table).toBeVisible();
        await expect(page.getByText('admin@test.sg')).toBeVisible();
        await expect(page.getByText('user@test.com')).toBeVisible();
    });

    test("User Role Badge Styling Verification", async ({ page }) => {
        const adminRow = page.locator('tr', { hasText: 'admin@test.sg' });
        const adminBadge = adminRow.locator('td div');
        await expect(adminBadge).toHaveText('Admin');
        await expect(adminBadge).toHaveCSS('background-color', 'rgb(255, 245, 245)');
        await expect(adminBadge).toHaveCSS('color', 'rgb(224, 49, 49)');
    });
});