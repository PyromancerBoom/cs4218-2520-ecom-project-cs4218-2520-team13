// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("Category Management - UI Verified via Mocking", () => {

    test.beforeEach(async ({ page }) => {
        await page.route('**/api/v1/auth/admin-auth', async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
        });

        await page.route('**/api/v1/category/get-category', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    success: true,
                    category: [
                        { _id: 'c1', name: 'Existing Category', slug: 'existing-category' }
                    ]
                }),
            });
        });

        await page.addInitScript(() => {
            window.localStorage.setItem('auth', JSON.stringify({
                user: { name: 'Admin Sandra', email: 'admin@test.sg', role: 1 },
                token: 'mock-jwt-token'
            }));
        });

        await page.goto(`${BASE_URL}/dashboard/admin/create-category`);
    });

    test("Category Input Validation (Empty & Duplicate)", async ({ page }) => {
        await page.route('**/api/v1/category/create-category', async (route) => {
            await route.fulfill({
                status: 400,
                body: JSON.stringify({ success: false, message: "Already exists" }),
            });
        });

        await page.getByRole('button', { name: 'Submit' }).click();

        await page.getByRole('textbox', { name: 'Category' }).fill('Existing Category');
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.locator('body')).toContainText(/Something went wrong in input form/i);
    });

    test("Category Creation and Update Sync", async ({ page }) => {
        const tempCat = "New Category";
        const finalCat = "Updated Category";

        await page.route('**/api/v1/category/create-category', async (route) => {
            await route.fulfill({
                status: 201,
                body: JSON.stringify({ success: true, message: `${tempCat} is created` }),
            });
        });

        await page.route('**/api/v1/category/update-category/*', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, message: `${finalCat} is updated` }),
            });
        });

        await page.getByRole('textbox', { name: 'Category' }).fill(tempCat);
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText(`${tempCat} is created`)).toBeVisible();

        const row = page.locator('tr', { hasText: 'Existing Category' });
        await row.getByRole('button', { name: 'Edit' }).click();

        const modalInput = page.getByRole('dialog').getByRole('textbox');
        await modalInput.fill(finalCat);
        await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText(`${finalCat} is updated`)).toBeVisible();
    });

    test("Category Deletion Verification", async ({ page }) => {
        await page.route('**/api/v1/category/delete-category/*', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, message: "Category is deleted" }),
            });
        });

        const deleteRow = page.locator('tr', { hasText: 'Existing Category' });
        await deleteRow.getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByText('Category is deleted')).toBeVisible();
    });
});