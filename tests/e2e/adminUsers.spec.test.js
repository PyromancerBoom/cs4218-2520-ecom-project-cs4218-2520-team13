// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("Admin User Management - Real API/DB Flow", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('admin@test.sg');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('admin@test.sg');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        const userMenu = page.getByRole('button', { name: 'ADMIN@TEST.SG', exact: false });
        await userMenu.waitFor({ state: 'visible', timeout: 15000 });
        await userMenu.click();

        await page.getByRole('link', { name: 'Dashboard' }).click();

        const usersLink = page.getByRole('link', { name: 'Users' });
        await usersLink.waitFor({ state: 'visible' });
        await usersLink.click();

        await expect(page).toHaveURL(/.*dashboard\/admin\/users/);
    });

    test("User List Display & Structural Verification", async ({ page }) => {
        await expect(page.locator('h1')).toContainText('All Users List');

        const table = page.locator('table');
        await expect(table).toBeVisible();

        await expect(page.getByText('admin@test.sg').first()).toBeVisible();

        const headers = page.locator('thead th');
        await expect(headers.nth(0)).toContainText('#');
        await expect(headers.nth(1)).toContainText('Name');
    });

    test("User Role Badge Styling Verification", async ({ page }) => {
        const adminRow = page.locator('tr', { hasText: 'admin@test.sg' }).first();

        const adminBadge = adminRow.locator('td').filter({ hasText: /^Admin$/i });
        await expect(adminBadge).toBeVisible();

        const badgeDiv = adminBadge.locator('div');
        await expect(badgeDiv).toHaveCSS('background-color', 'rgb(255, 245, 245)');
        await expect(badgeDiv).toHaveCSS('color', 'rgb(224, 49, 49)');
    });
});