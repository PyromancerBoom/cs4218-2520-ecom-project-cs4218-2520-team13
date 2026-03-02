// client/src/__tests__/integration/handlers/auth.handlers.js
// Wei Sheng, A0259272X
// Reusable MSW handlers for auth-related endpoints.
import { http, HttpResponse } from 'msw';

export const mockOrder = (overrides = {}) => ({
  _id: 'order-id-1',
  status: 'Not Process',
  buyer: { name: 'Test Buyer' },
  createAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  payment: { success: true },
  products: [
    {
      _id: 'product-id-1',
      name: 'Test Product',
      description: 'A test product description exceeding thirty chars',
      price: 99.99,
    },
  ],
  ...overrides,
});

export const ordersHandlers = (orders = [mockOrder()]) => [
  http.get('/api/v1/auth/orders', () => HttpResponse.json(orders)),
];

export const userAuthHandlers = (ok = true) => [
  http.get('/api/v1/auth/user-auth', () => HttpResponse.json({ ok })),
];

export const adminAuthHandlers = (ok = true) => [
  http.get('/api/v1/auth/admin-auth', () => HttpResponse.json({ ok })),
];
