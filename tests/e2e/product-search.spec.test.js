// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';

test.describe('Search Functionality E2E & Edge Case Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    });

    test('should search for a product and show results correctly', async ({ page }) => {
        const searchBox = page.getByRole('searchbox', { name: 'Search' });

        await searchBox.fill('Novel');

        // Use Promise.all to ensure we catch the navigation triggered by the click
        await Promise.all([
            page.waitForURL(/.*search/, { timeout: 10000 }),
            page.getByRole('button', { name: 'Search' }).first().click()
        ]);

        await expect(page.getByRole('main')).toContainText('Novel');
        await expect(page.getByRole('heading', { name: 'Novel', level: 5 })).toBeVisible();
    });

    test('should search and add product to cart', async ({ page }) => {
        const searchBox = page.getByRole('searchbox', { name: 'Search' });
        await searchBox.fill('Novel');

        // Alternative: Pressing Enter can sometimes bypass button-specific UI bugs
        await Promise.all([
            page.waitForURL(/.*search/, { timeout: 10000 }),
            searchBox.press('Enter')
        ]);

        const productCard = page.locator('.card').filter({ hasText: 'Novel' }).first();
        await productCard.waitFor({ state: 'visible' });

        await productCard.getByRole('button', { name: /ADD TO CART/i }).click();

        await expect(page.getByText('Item Added to cart')).toBeVisible();
        await expect(page.locator('.ant-badge-count')).toHaveText('1');
    });

    test('should handle empty search keyword', async ({ page }) => {
        await page.getByRole('button', { name: 'Search' }).first().click();
        await expect(page.getByText('Please enter a keyword to')).toBeVisible();
    });

    test('should navigate to details from search result', async ({ page }) => {
        await page.getByRole('searchbox', { name: 'Search' }).fill('Novel');

        await Promise.all([
            page.waitForURL(/.*search/, { timeout: 10000 }),
            page.getByRole('button', { name: 'Search' }).first().click()
        ]);

        const moreDetailsBtn = page.getByRole('button', { name: 'More Details' }).first();
        await moreDetailsBtn.waitFor({ state: 'visible' });
        await moreDetailsBtn.click();

        await expect(page.locator('h1')).toContainText('Product Details');
        await expect(page.getByRole('heading', { name: /Name : Novel/i })).toBeVisible();
    });
});