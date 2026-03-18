// LOW WEI SHENG, A0259272X
// client/src/__tests__/integration/Orders.integration.test.js
// LOW WEI SHENG, A0259272X
// Frontend integration tests for pages/user/Orders.js using MSW.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { server } from './server';
import { ordersHandlers, mockOrder } from './handlers/auth.handlers';
import { http, HttpResponse } from 'msw';

// Mock auth context — provide a logged-in user by default
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [
    { user: { name: 'Test User' }, token: 'test-token' },
    jest.fn(),
  ]),
}));

// Mock Layout to avoid pulling in Header/Footer dependencies
jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>);

// Mock moment to return a stable string
jest.mock('moment', () => () => ({ fromNow: () => '2 days ago' }));

import axios from 'axios';
import Orders from '../../pages/user/Orders';
import { useAuth } from '../../context/auth';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  // AuthProvider sets axios.defaults.headers.common["Authorization"] = auth.token.
  // Since we mock useAuth and don't render AuthProvider, mirror that here so the
  // component's axios calls carry the token.
  axios.defaults.headers.common['Authorization'] = 'test-token';
});
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  // jest.clearAllMocks() clears call counts but NOT mockReturnValue overrides.
  // Re-establish the default logged-in state so tests that change useAuth
  // (e.g. "does not call the API when token is absent") don't bleed into later tests.
  useAuth.mockReturnValue([
    { user: { name: 'Test User' }, token: 'test-token' },
    jest.fn(),
  ]);
  delete axios.defaults.headers.common['Authorization'];
});
afterAll(() => server.close());

const renderOrders = () =>
  render(
    <MemoryRouter>
      <Orders />
    </MemoryRouter>
  );

describe('Orders component — frontend integration', () => {
  it('renders order status, buyer name, payment status, and product details', async () => {
    server.use(...ordersHandlers());
    renderOrders();

    await waitFor(() => {
      expect(screen.getByText('Not Process')).toBeInTheDocument();
      expect(screen.getByText('Test Buyer')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText(/99\.99/)).toBeInTheDocument();
    });
  });

  it('truncates product description to 30 characters', async () => {
    server.use(...ordersHandlers());
    renderOrders();

    await waitFor(() => {
      // description is "A test product description exceeding thirty chars" (49 chars)
      // truncated to 30: "A test product description exc"
      expect(screen.getByText('A test product description exc')).toBeInTheDocument();
    });
  });

  it('shows "Success" for payment.success = true', async () => {
    server.use(...ordersHandlers([mockOrder({ payment: { success: true } })]));
    renderOrders();
    await waitFor(() => expect(screen.getByText('Success')).toBeInTheDocument());
  });

  it('shows "Failed" for payment.success = false', async () => {
    server.use(...ordersHandlers([mockOrder({ payment: { success: false } })]));
    renderOrders();
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
  });

  it('renders all products in an order with multiple products', async () => {
    const order = mockOrder({
      products: [
        { _id: 'p1', name: 'Product One', description: 'Desc one', price: 10 },
        { _id: 'p2', name: 'Product Two', description: 'Desc two', price: 20 },
        { _id: 'p3', name: 'Product Three', description: 'Desc three', price: 30 },
      ],
    });
    server.use(...ordersHandlers([order]));
    renderOrders();

    await waitFor(() => {
      expect(screen.getByText('Product One')).toBeInTheDocument();
      expect(screen.getByText('Product Two')).toBeInTheDocument();
      expect(screen.getByText('Product Three')).toBeInTheDocument();
    });
  });

  it('renders all orders when multiple orders are returned', async () => {
    const orders = [
      mockOrder({ _id: 'o1', status: 'Not Process' }),
      mockOrder({ _id: 'o2', status: 'Processing' }),
      mockOrder({ _id: 'o3', status: 'Shipped' }),
    ];
    server.use(...ordersHandlers(orders));
    renderOrders();

    await waitFor(() => {
      expect(screen.getByText('Not Process')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
    });
  });

  it('renders the mocked relative date string', async () => {
    server.use(...ordersHandlers());
    renderOrders();
    await waitFor(() => expect(screen.getByText('2 days ago')).toBeInTheDocument());
  });

  it('does not call the API when token is absent', async () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
    let apiCalled = false;
    server.use(
      http.get('/api/v1/auth/orders', () => {
        apiCalled = true;
        return HttpResponse.json([]);
      })
    );
    renderOrders();

    await new Promise(r => setTimeout(r, 100));
    expect(apiCalled).toBe(false);
  });

  it('renders no orders when API returns empty array', async () => {
    server.use(...ordersHandlers([]));
    renderOrders();

    await waitFor(() => {
      // No order status cells present
      expect(screen.queryByText('Not Process')).not.toBeInTheDocument();
    });
  });

  it('does not crash when API returns 500', async () => {
    server.use(
      http.get('/api/v1/auth/orders', () => HttpResponse.json({}, { status: 500 }))
    );
    expect(() => renderOrders()).not.toThrow();
    await new Promise(r => setTimeout(r, 100));
  });

  it('shows a loading state before the response resolves', async () => {
    let resolveResponse;
    server.use(
      http.get('/api/v1/auth/orders', () =>
        new Promise(resolve => { resolveResponse = resolve; })
      )
    );
    renderOrders();

    // Component should show nothing before data arrives
    expect(screen.queryByText('Not Process')).not.toBeInTheDocument();

    // The request is made in a useEffect — wait for MSW to intercept it
    // (which sets resolveResponse) before calling the resolver.
    await waitFor(() => expect(typeof resolveResponse).toBe('function'));
    resolveResponse(HttpResponse.json([mockOrder()]));
    await waitFor(() => expect(screen.getByText('Not Process')).toBeInTheDocument());
  });

  it('sends the Authorization header with the request', async () => {
    let capturedAuthHeader;
    server.use(
      http.get('/api/v1/auth/orders', ({ request }) => {
        capturedAuthHeader = request.headers.get('authorization');
        return HttpResponse.json([]);
      })
    );
    renderOrders();

    await waitFor(() => expect(capturedAuthHeader).toBe('test-token'));
  });

  it('does not crash when a product has an empty description', async () => {
    // Orders.js calls p.description.substring(0,30) — empty string is safe, undefined is not
    const order = mockOrder({
      products: [{ _id: 'p1', name: 'No Desc Product', description: '', price: 50 }],
    });
    server.use(...ordersHandlers([order]));
    expect(() => renderOrders()).not.toThrow();
    await waitFor(() => expect(screen.getByText('No Desc Product')).toBeInTheDocument());
  });

  it('shows "Failed" when order payment.success is missing', async () => {
    // Orders.js uses o?.payment.success — if payment:{} then success is undefined → "Failed"
    const order = mockOrder({ payment: {} });
    server.use(...ordersHandlers([order]));
    renderOrders();
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
  });

  it('does not crash when order has no products array', async () => {
    const order = mockOrder({ products: undefined });
    server.use(...ordersHandlers([order]));
    expect(() => renderOrders()).not.toThrow();
    await new Promise(r => setTimeout(r, 100));
  });
});
