// tests/e2e/admin-orders.spec.ts
// Wei Sheng, A0259272X
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
    const { user: buyer } = await seedUser({ email: 'buyer@e2e.test' });
    const product = await seedProduct();
    // Seed a stable read-only order for non-mutation tests
    await seedOrder({ buyer: buyer._id, products: [product._id], status: 'Not Process' });
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  // Helper: log in as admin via UI
  async function loginAsAdmin(page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  }

  test('admin sees order list on /dashboard/admin/orders', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');
    await expect(page.getByText('Not Process')).toBeVisible();
    await expect(page.getByText('E2E Product')).toBeVisible();
  });

  test('status update reflects in UI immediately after selection', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');
    const dropdown = page.locator('select').first();
    await dropdown.selectOption('Processing');
    await expect(dropdown).toHaveValue('Processing');
  });

  test('status update persists after page reload (API round-trip confirmed)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');
    const dropdown = page.locator('select').first();

    const responsePromise = page.waitForResponse(
      r => r.url().includes('/order-status/') && r.request().method() === 'PUT'
    );
    await dropdown.selectOption('Shipped');
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    await page.reload();
    await expect(page.locator('select').first()).toHaveValue('Shipped');
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
        // Find the row for the mutation order and change its status
        const dropdown = page.locator(`[data-order-id="${mutationOrderId}"] select`).or(
          page.locator('select').last() // fallback if no data attribute
        );
        const responsePromise = page.waitForResponse(
          r => r.url().includes('/order-status/') && r.request().method() === 'PUT'
        );
        await dropdown.selectOption(status);
        const response = await responsePromise;
        expect(response.status()).toBe(200);
        await page.reload();
        await expect(dropdown).toHaveValue(status);
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
    await page.goto('/dashboard/admin/orders');

    const statuses = await page.locator('select').allInnerTexts();
    // "Shipped" (newer) should appear before "Processing" (older)
    const shippedIndex = statuses.findIndex(s => s.includes('Shipped'));
    const processingIndex = statuses.findIndex(s => s.includes('Processing'));
    expect(shippedIndex).toBeLessThan(processingIndex);

    // cleanup extra orders
    await mongoose.model('Order').deleteMany({ _id: { $in: [older._id, newer._id] } });
  });

  test('Authorization header is sent with the all-orders request', async ({ page }) => {
    let authHeader: string | null = null;
    await page.route('**/api/v1/auth/all-orders', route => {
      authHeader = route.request().headers()['authorization'] ?? null;
      route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');
    await page.waitForResponse(r => r.url().includes('/all-orders'));
    expect(authHeader).toBeTruthy();
  });

  test('page does not crash when status update returns 500', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin/orders');

    await page.route('**/api/v1/auth/order-status/**', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ success: false }) })
    );
    const dropdown = page.locator('select').first();
    await dropdown.selectOption('Processing');
    // Page must still be functional — heading or key element still present
    await expect(page.getByText(/order/i).first()).toBeVisible();
  });

  test('non-admin is redirected away from /dashboard/admin/orders', async ({ page }) => {
    const { user: regularUser } = await seedUser({ email: 'regular@e2e.test', plainPassword: 'pass123' });
    await page.goto('/login');
    await page.fill('input[type="email"]', 'regular@e2e.test');
    await page.fill('input[type="password"]', 'pass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await page.goto('/dashboard/admin/orders');
    await expect(page).not.toHaveURL(/admin\/orders/);
  });
});
