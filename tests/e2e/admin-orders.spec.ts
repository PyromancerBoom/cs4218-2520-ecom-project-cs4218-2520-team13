// LOW WEI SHENG, A0259272X
// tests/e2e/admin-orders.spec.ts
// LOW WEI SHENG, A0259272X
// E2E tests for admin order status management flow.
import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import {
  connectTestDB, disconnectTestDB, clearTestCollections,
  seedAdmin, seedUser, seedProduct, seedOrder,
} from '../helpers/e2eDb.js';

test.describe('Admin order status management', () => {
  let adminEmail: string;
  const adminPassword = 'admin123';

  test.beforeAll(async () => {
    await connectTestDB();
    await clearTestCollections();
    const { user: admin } = await seedAdmin({ email: 'admin@e2e.test', plainPassword: adminPassword });
    adminEmail = admin.email;
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  // Helper: log in as admin programmatically (API call → localStorage → reload)
  async function loginAsAdmin(page) {
    const res = await page.request.post('http://localhost:6060/api/v1/auth/login', {
      data: { email: adminEmail, password: adminPassword },
    });
    const data = await res.json();
    await page.goto('/');
    await page.evaluate((auth) => localStorage.setItem('auth', JSON.stringify(auth)), data);
    await page.reload();
  }

  // Helper: select an Ant Design Select option by clicking the selector then the option text
  async function selectAntOption(page, selectorLocator, optionText: string) {
    // Wait for the selector to be visible and stable (orders may still be loading)
    await expect(selectorLocator).toBeVisible({ timeout: 10000 });
    await selectorLocator.click();
    // Wait for the first option item to appear (dropdown is open)
    await expect(page.locator('.ant-select-item-option').first()).toBeVisible({ timeout: 5000 });
    await page.locator('.ant-select-item-option').filter({ hasText: optionText }).first().click();
  }

  test('admin sees order list on /dashboard/admin/orders', async ({ page }) => {
    const { user: buyer } = await seedUser({ email: 'buyer-read@e2e.test' });
    const product = await seedProduct();
    const order = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Not Process' });

    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');
    await expect(page.getByText('Not Process')).toBeVisible();
    await expect(page.getByText('E2E Product')).toBeVisible();

    // cleanup
    await mongoose.model('Order').findByIdAndDelete(order._id);
  });

  test.describe('status update — isolated mutation tests (tests 2 and 3)', () => {
    let isolatedOrderId: string;

    test.beforeEach(async () => {
      const { user: buyer } = await seedUser();
      const product = await seedProduct();
      const order = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Not Process' });
      isolatedOrderId = order._id.toString();
    });

    test.afterEach(async () => {
      await mongoose.model('Order').findByIdAndDelete(isolatedOrderId);
    });

    test('status update reflects in UI immediately after selection', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/dashboard/admin/orders');
      const selector = page.locator('.ant-select-selector').first();
      await selectAntOption(page, selector, 'Processing');
      await expect(page.locator('.ant-select-selector').first()).toContainText('Processing');
    });

    test('status update persists after page reload (API round-trip confirmed)', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/dashboard/admin/orders');

      const responsePromise = page.waitForResponse(
        r => r.url().includes('/order-status/') && r.request().method() === 'PUT'
      );
      const selector = page.locator('.ant-select-selector').first();
      await selectAntOption(page, selector, 'Shipped');
      const response = await responsePromise;
      expect(response.status()).toBe(200);

      await page.reload();
      await expect(page.locator('.ant-select-selector').first()).toContainText('Shipped');
    });
  });

  test.describe('status cycling — isolated mutation tests', () => {
    let mutationOrderId: string;

    test.beforeEach(async () => {
      const { user: buyer } = await seedUser();
      const product = await seedProduct();
      const order = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Not Process' });
      mutationOrderId = order._id.toString();
    });

    test.afterEach(async () => {
      await mongoose.model('Order').findByIdAndDelete(mutationOrderId);
    });

    for (const status of ['Not Process', 'Processing', 'Shipped', 'delivered', 'cancel']) {
      test(`status "${status}" can be set and persists`, async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/dashboard/admin/orders');
        // Order is seeded with 'Not Process'; if target is also 'Not Process' the
        // Select won't fire onChange (same value). Change away first so the PUT fires.
        const selectorLocator = page.locator('.ant-select-selector').last();
        if (status === 'Not Process') {
          await selectAntOption(page, selectorLocator, 'Processing');
          await page.waitForResponse(
            r => r.url().includes('/order-status/') && r.request().method() === 'PUT'
          );
        }
        const responsePromise = page.waitForResponse(
          r => r.url().includes('/order-status/') && r.request().method() === 'PUT'
        );
        await selectAntOption(page, selectorLocator, status);
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        await page.reload();
        await expect(page.locator('.ant-select-selector').last()).toContainText(status);
      });
    }
  });

  test('multiple orders appear sorted newest-first', async ({ page }) => {
    const { user: buyer } = await seedUser();
    const product = await seedProduct();
    const older = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Processing' });
    await new Promise(r => setTimeout(r, 50));
    const newer = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Shipped' });

    await loginAsAdmin(page);
    const allOrdersPromise = page.waitForResponse(r => r.url().includes('/all-orders'));
    await page.goto('/dashboard/admin/orders');
    await allOrdersPromise;
    await expect(page.locator('.ant-select-selector').first()).toBeVisible();

    const selectors = page.locator('.ant-select-selector');
    const count = await selectors.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(await selectors.nth(i).innerText());
    }
    // "Shipped" (newer) should appear before "Processing" (older)
    const shippedIndex = texts.findIndex(s => s.includes('Shipped'));
    const processingIndex = texts.findIndex(s => s.includes('Processing'));
    expect(shippedIndex).toBeLessThan(processingIndex);

    // cleanup extra orders
    await mongoose.model('Order').deleteMany({ _id: { $in: [older._id, newer._id] } });
  });

  test('Authorization header is sent with the all-orders request', async ({ page }) => {
    let authHeader: string | null = null;
    await page.route('**/api/v1/auth/all-orders', async route => {
      authHeader = route.request().headers()['authorization'] ?? null;
      await route.continue();
    });
    await loginAsAdmin(page);
    // Create the promise BEFORE goto to avoid missing a fast response
    const responsePromise = page.waitForResponse(r => r.url().includes('/all-orders'));
    await page.goto('/dashboard/admin/orders');
    await responsePromise;
    expect(authHeader).toBeTruthy();
  });

  test('page does not crash when status update returns 500', async ({ page }) => {
    const { user: buyer } = await seedUser();
    const product = await seedProduct();
    const order = await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Not Process' });

    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');

    await page.route('**/api/v1/auth/order-status/**', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ success: false }) })
    );
    const selector = page.locator('.ant-select-selector').first();
    await selectAntOption(page, selector, 'Processing');
    // Page must still be functional — heading or key element still present
    await expect(page.getByText(/order/i).first()).toBeVisible();

    // cleanup
    await mongoose.model('Order').findByIdAndDelete(order._id);
  });

  test('non-admin is redirected away from /dashboard/admin/orders', async ({ page }) => {
    const { user: regularUser } = await seedUser({ email: 'regular@e2e.test', plainPassword: 'pass123' });
    const res = await page.request.post('http://localhost:6060/api/v1/auth/login', {
      data: { email: 'regular@e2e.test', password: 'pass123' },
    });
    const data = await res.json();
    await page.goto('/');
    await page.evaluate((auth) => localStorage.setItem('auth', JSON.stringify(auth)), data);
    await page.reload();
    await page.goto('/dashboard/admin/orders');
    await expect(page).not.toHaveURL(/admin\/orders/);
  });
});
