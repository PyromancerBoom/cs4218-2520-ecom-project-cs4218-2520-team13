// A0338250J LOU, YING-WEN
//use admin@test.sg to test admin category management features
import { test, expect } from '@playwright/test';

const BASE_URL = "http://localhost:3000";

test.describe("Category Management - Integration & Lifecycle", () => {
    let existingCategoryName = "";

    test.beforeAll(async ({ request }) => {
        const resp = await request.get(`${BASE_URL}/api/v1/category/get-category`);
        const json = await resp.json();
        if (json.category && json.category.length > 0) {
            existingCategoryName = json.category[0].name;
        }
    });

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
        await page.getByRole('link', { name: 'Create Category' }).click();
    });

    test("Category Input Validation (Empty & Duplicate)", async ({ page }) => {
        await page.getByRole('textbox', { name: 'Category' }).clear();
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText('Category name is required')).toBeVisible();

        if (existingCategoryName) {
            await page.getByRole('textbox', { name: 'Category' }).fill(existingCategoryName);
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.locator('body')).toContainText(/already exists/i);
        }
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

        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();

        await expect(page.getByRole('link', { name: tempCat })).not.toBeVisible();
        const catLink = page.getByRole('link', { name: finalCat });
        await expect(catLink).toBeVisible();
        await catLink.click();
        await expect(page.getByRole('heading', { name: `Category - ${finalCat}` })).toBeVisible();

        await page.getByRole('button', { name: 'ADMIN@TEST.SG', exact: false }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.getByRole('link', { name: 'Create Category' }).click();

        const deleteRow = page.locator('tr', { hasText: finalCat });
        await deleteRow.getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByText('Category is deleted')).toBeVisible();

        await page.getByRole('link', { name: 'Categories' }).click();
        await page.getByRole('link', { name: 'All Categories' }).click();
        await expect(page.getByRole('link', { name: finalCat })).not.toBeVisible();
    });
});