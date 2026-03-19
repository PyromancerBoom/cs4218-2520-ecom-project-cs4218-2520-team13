// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';
import {
    connectTestDB,
    disconnectTestDB,
    clearTestCollections,
    seedProduct
} from '../helpers/e2eDb.js';

test.describe.configure({ mode: 'serial' });
const BASE_URL = "http://localhost:3000";

test.describe('Search Functionality E2E & Edge Case Tests', () => {

    test.beforeAll(async () => {
        await connectTestDB();
    });

    test.afterAll(async () => {
        await disconnectTestDB();
    });

    test.beforeEach(async ({ page }) => {
        await clearTestCollections();

        await seedProduct({
            name: 'Novel Product',
            price: 29.99,
            description: 'A very interesting mystery novel for testing.'
        });

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    });

    test('should search for a product and show results correctly', async ({ page }) => {
        const searchBox = page.getByPlaceholder(/Search/i);
        await searchBox.fill('Novel');

        await Promise.all([
            page.waitForURL(/.*search/),
            page.locator('.search-form button[type="submit"]').or(page.getByRole('button', { name: 'Search' }).first()).click()
        ]);

        await expect(page.locator('main')).toContainText('Novel');
        await expect(page.getByText('Novel Product')).toBeVisible();
    });

    test('should search and add product to cart', async ({ page }) => {
        const searchBox = page.getByPlaceholder(/Search/i);
        await searchBox.fill('Novel');

        await Promise.all([
            page.waitForURL(/.*search/),
            searchBox.press('Enter')
        ]);

        const productCard = page.locator('.card').filter({ hasText: 'Novel Product' }).first();
        await productCard.waitFor({ state: 'visible' });

        await productCard.getByRole('button', { name: /ADD TO CART/i }).click();

        await expect(page.locator('body')).toContainText(/Added to cart/i);
        await expect(page.locator('.ant-badge-count')).toHaveText('1');
    });

    test('should handle empty search keyword', async ({ page }) => {
        const searchButton = page.locator('.search-form button[type="submit"]').or(page.getByRole('button', { name: 'Search' }).first());
        await searchButton.click();

        await expect(page.locator('body')).toContainText(/enter a keyword/i);
    });

    test('should navigate to details from search result', async ({ page }) => {
        const searchBox = page.getByPlaceholder(/Search/i);
        await searchBox.fill('Novel');

        await Promise.all([
            page.waitForURL(/.*search/),
            searchBox.press('Enter')
        ]);

        const moreDetailsBtn = page.getByRole('button', { name: /More Details/i }).first();
        await moreDetailsBtn.waitFor({ state: 'visible' });
        await moreDetailsBtn.click();

        await expect(page).toHaveURL(/.*product\/.*/);
        await expect(page.locator('h1')).toContainText(/Product Details/i);
        await expect(page.getByText('Novel Product')).toBeVisible();
    });
});