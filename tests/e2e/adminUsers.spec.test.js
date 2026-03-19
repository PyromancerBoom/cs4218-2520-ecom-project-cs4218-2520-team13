// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';
import {
    connectTestDB,
    disconnectTestDB,
    clearTestCollections,
    seedAdmin
} from '../helpers/e2eDb.js';

test.describe.configure({ mode: 'serial' });
const BASE_URL = "http://localhost:3000";

test.describe("Admin User Management - Integration Flow", () => {
    let adminEmail = "";
    const adminPassword = "admin123";

    async function loginAndNavigateToUsers(page) {

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', adminEmail);
        await page.fill('input[type="password"]', adminPassword);


        await page.locator('.form-container button[type="submit"]').click();


        await page.getByRole('button', { name: /E2E ADMIN/i }).click();
        await page.getByRole('link', { name: /Dashboard/i }).click();

        const usersLink = page.getByRole('link', { name: 'Users' });
        await usersLink.waitFor({ state: 'visible' });
        await usersLink.click();

        await expect(page).toHaveURL(/.*dashboard\/admin\/users/);
    }

    test.beforeAll(async () => {
        await connectTestDB();
        await clearTestCollections();
        const { user: admin } = await seedAdmin({
            email: 'admin@e2e.test',
            plainPassword: adminPassword
        });
        adminEmail = admin.email;
    });

    test.afterAll(async () => {
        await disconnectTestDB();
    });

    test.beforeEach(async ({ page }) => {
        await loginAndNavigateToUsers(page);
    });

    test("User List Display & Structural Verification", async ({ page }) => {
        await expect(page.locator('h1')).toContainText('All Users List');
        const table = page.locator('table');
        await expect(table).toBeVisible();

        // Verify admin exists in the list
        await expect(page.getByText(adminEmail).first()).toBeVisible();

        const headers = page.locator('thead th');
        await expect(headers.nth(0)).toContainText('#');
        await expect(headers.nth(1)).toContainText('Name');
    });

    test("User Role Badge Styling Verification", async ({ page }) => {
        const adminRow = page.locator('tr', { hasText: adminEmail }).first();
        const adminBadge = adminRow.locator('td').filter({ hasText: /^Admin$/i });
        await expect(adminBadge).toBeVisible();

        const badgeDiv = adminBadge.locator('div');
        await expect(badgeDiv).toHaveCSS('background-color', 'rgb(255, 245, 245)');
        await expect(badgeDiv).toHaveCSS('color', 'rgb(224, 49, 49)');
    });
});