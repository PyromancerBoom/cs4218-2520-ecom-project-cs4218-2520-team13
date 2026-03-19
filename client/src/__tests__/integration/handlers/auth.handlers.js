// Reusable MSW handlers for auth-related endpoints.
import { http, HttpResponse } from 'msw';

// LOW WEI SHENG, A0259272X
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

// LOW WEI SHENG, A0259272X
export const ordersHandlers = (orders = [mockOrder()]) => [
  http.get('/api/v1/auth/orders', () => HttpResponse.json(orders)),
];

// LOW WEI SHENG, A0259272X
export const userAuthHandlers = (ok = true) => [
  http.get('/api/v1/auth/user-auth', () => HttpResponse.json({ ok })),
];

// LOW WEI SHENG, A0259272X
export const adminAuthHandlers = (ok = true) => [
  http.get('/api/v1/auth/admin-auth', () => HttpResponse.json({ ok })),
];

// LOW WEI SHENG, A0259272X
export const mockUpdatedUser = (overrides = {}) => ({
  _id: 'user-id-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '12345678',
  address: '123 Test St',
  ...overrides,
});

// LOW WEI SHENG, A0259272X
export const profileUpdateHandlers = (updatedUser = mockUpdatedUser()) => [
  http.put('/api/v1/auth/profile', () => HttpResponse.json({ updatedUser })),
];

// LOW WEI SHENG, A0259272X
export const allOrdersHandlers = (orders = [mockOrder()]) => [
  http.get('/api/v1/auth/all-orders', () => HttpResponse.json(orders)),
];

// LOW WEI SHENG, A0259272X
export const orderStatusHandlers = (orderId = ':orderId', updatedOrder = {}) => [
  http.put(`/api/v1/auth/order-status/${orderId}`, () =>
    HttpResponse.json({ ...mockOrder(), ...updatedOrder })
  ),
];
