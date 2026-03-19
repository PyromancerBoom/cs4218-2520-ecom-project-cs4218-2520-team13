// A0338250J LOU, YING-WEN
import { test, expect } from '@playwright/test';
import {
    connectTestDB,
    disconnectTestDB,
    clearTestCollections,
    seedUser
} from '../helpers/e2eDb.js';

test.describe('User Profile Management - Integration Suite', () => {
    const userPassword = 'userpass123';
    const userEmail = 'user@e2e.test';

    async function loginAsUser(page) {
        await page.goto('/login');
        await page.fill('input[type="email"]', userEmail);
        await page.fill('input[type="password"]', userPassword);
        await page.locator('.form-container button[type="submit"]').click();
        await page.getByRole('button', { name: /E2E USER/i }).click();
        await page.getByRole('link', { name: /Dashboard/i }).click();
    }

    test.beforeAll(async () => {
        await connectTestDB();
        await clearTestCollections();

        await seedUser({
            email: userEmail,
            plainPassword: userPassword,
        });
    });

    test.afterAll(async () => {
        await clearTestCollections();
        await disconnectTestDB();
    });

    test.beforeEach(async ({ page }) => {
        await loginAsUser(page);
    });

    test('Happy Path: Update and Persistent Check', async ({ page }) => {
        await page.goto('/dashboard/user/profile');

        const testPhone = "812345678";
        const testAddress = "1 Computing Drives";

        await page.getByPlaceholder('Enter Your Phone').fill(testPhone);
        await page.getByPlaceholder('Enter Your Address').fill(testAddress);

        const responsePromise = page.waitForResponse(resp =>
            resp.url().includes('/api/v1/auth/profile') && resp.status() === 200
        );
        await page.getByRole('button', { name: 'UPDATE' }).click();
        await responsePromise;

        await expect(page.locator('body')).toContainText(/updated|successfully/i);

        await page.reload();
        await expect(page.getByPlaceholder('Enter Your Phone')).toHaveValue(testPhone);
        await expect(page.getByPlaceholder('Enter Your Address')).toHaveValue(testAddress);
    });

    test('Edge Case: Mandatory Name', async ({ page }) => {
        await page.goto('/dashboard/user/profile');
        const nameInput = page.getByPlaceholder('Enter Your Name');
        await nameInput.clear();
        await page.getByRole('button', { name: 'UPDATE' }).click();
        await expect(page.locator('body')).toContainText(/name/i);
    });

    test('Security: Constrained Fields', async ({ page }) => {
        await page.goto('/dashboard/user/profile');
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).not.toBeEditable();
        await expect(emailInput).toHaveValue(userEmail);

        const passwordInput = page.getByPlaceholder('Enter Your Password');
        await expect(passwordInput).toHaveValue('');
    });
});