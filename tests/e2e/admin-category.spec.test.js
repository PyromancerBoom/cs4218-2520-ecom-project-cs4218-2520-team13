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

test.describe("Category Management - Integration & Lifecycle", () => {
    let adminEmail = "";
    const adminPassword = "admin";

    async function loginAndNavigate(page) {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', adminEmail);
        await page.fill('input[type="password"]', adminPassword);

        await page.locator('.form-container button[type="submit"]').click();

        await page.getByRole('button', { name: /E2E ADMIN/i }).click();
        await page.getByRole('link', { name: /Dashboard/i }).click();


        await page.getByRole('link', { name: 'Create Category' }).click();

        await expect(page.getByRole('heading', { name: /category/i })).toBeVisible();
    }

    test.beforeAll(async () => {
        await connectTestDB();
        await clearTestCollections();
        const { user: admin } = await seedAdmin({
            email: 'admin-category@e2e.test',
            plainPassword: adminPassword
        });
        adminEmail = admin.email;
    });

    test.afterAll(async () => {
        await disconnectTestDB();
    });

    test.beforeEach(async ({ page }) => {
        await loginAndNavigate(page);
    });

    test("Category Input Validation (Empty & Duplicate)", async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Category' });
        await input.clear();
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText('Category name is required')).toBeVisible();

        const duplicateName = "Electronics";
        await input.fill(duplicateName);
        await page.getByRole('button', { name: 'Submit' }).click();

        await input.fill(duplicateName);
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.locator('body')).toContainText(/already exists/i);
    });

    test("Category Full Lifecycle & Frontend Sync Verification", async ({ page }) => {
        const tempCat = `Cat_${Date.now()}`;
        const finalCat = `Cats_${Date.now()}`;

        await page.getByRole('textbox', { name: 'Category' }).fill(tempCat);
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText(`${tempCat} is created`)).toBeVisible();

        const row = page.locator('tr', { hasText: tempCat });
        await row.getByRole('button', { name: 'Edit' }).click();
        await page.getByRole('dialog').getByRole('textbox', { name: 'Category' }).fill(finalCat);
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText(`${finalCat} is updated`)).toBeVisible();

        const deleteRow = page.locator('tr', { hasText: finalCat });
        await deleteRow.getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByText('Category is deleted')).toBeVisible();
    });
});