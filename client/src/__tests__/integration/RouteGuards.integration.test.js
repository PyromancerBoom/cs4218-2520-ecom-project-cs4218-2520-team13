// client/src/__tests__/integration/RouteGuards.integration.test.js
// Wei Sheng, A0259272X
// Frontend integration tests for Private.js and AdminRoute.js using MSW.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { server } from './server';
import { userAuthHandlers, adminAuthHandlers } from './handlers/auth.handlers';
import { http, HttpResponse } from 'msw';

// Mock auth context
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(),
}));

// Private.js and AdminRoute.js import { set } from "mongoose" (a source bug).
// Mock mongoose to prevent the server-side module from loading in jsdom.
jest.mock('mongoose', () => ({ set: jest.fn() }));

import axios from 'axios';
import Private from '../../components/Routes/Private';
import AdminRoute from '../../components/Routes/AdminRoute';
import { useAuth } from '../../context/auth';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
beforeEach(() => {
  // Mirror what AuthProvider does: set the axios default Authorization header.
  // Without AuthProvider rendered, this is the only way axios picks up the token.
  axios.defaults.headers.common['Authorization'] = 'valid-token';
});
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  delete axios.defaults.headers.common['Authorization'];
});
afterAll(() => server.close());

const ProtectedContent = () => <div data-testid="protected-content">Protected</div>;

const renderPrivate = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<Private />}>
          <Route path="/protected" element={<ProtectedContent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const renderAdminRoute = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<ProtectedContent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

// ─── Private.js ───────────────────────────────────────────────────────────────
describe('Private route guard', () => {
  it('renders protected content when /user-auth returns { ok: true }', async () => {
    useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
    server.use(...userAuthHandlers(true));
    renderPrivate();

    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
  });

  it('renders Spinner (not protected content) when /user-auth returns { ok: false }', async () => {
    useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
    server.use(...userAuthHandlers(false));
    renderPrivate();

    await waitFor(() => {
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      // Spinner renders a countdown or loading element
      expect(document.body.textContent).toMatch(/\d|load/i);
    });
  });

  it('renders Spinner and does not call API when token is absent', async () => {
    useAuth.mockReturnValue([{ token: '' }, jest.fn()]);
    let apiCalled = false;
    server.use(
      http.get('/api/v1/auth/user-auth', () => {
        apiCalled = true;
        return HttpResponse.json({ ok: true });
      })
    );
    renderPrivate();

    await new Promise(r => setTimeout(r, 100));
    expect(apiCalled).toBe(false);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders Spinner while auth check is in flight (loading state)', async () => {
    useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
    let resolveResponse;
    server.use(
      http.get('/api/v1/auth/user-auth', () =>
        new Promise(resolve => { resolveResponse = resolve; })
      )
    );
    renderPrivate();

    // Before response: protected content must not be shown
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // Wait for MSW to intercept the request (sets resolveResponse) before resolving
    await waitFor(() => expect(typeof resolveResponse).toBe('function'));
    resolveResponse(HttpResponse.json({ ok: true }));
    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
  });

  it('renders Spinner and does not crash on 401 response', async () => {
    useAuth.mockReturnValue([{ token: 'expired-token' }, jest.fn()]);
    server.use(
      http.get('/api/v1/auth/user-auth', () =>
        HttpResponse.json({ ok: false }, { status: 401 })
      )
    );
    expect(() => renderPrivate()).not.toThrow();
    await waitFor(() =>
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    );
  });

  it('renders Spinner and does not crash on network error', async () => {
    useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
    server.use(
      http.get('/api/v1/auth/user-auth', () => HttpResponse.error())
    );
    expect(() => renderPrivate()).not.toThrow();
    await new Promise(r => setTimeout(r, 100));
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('calls /api/v1/auth/user-auth — not /admin-auth', async () => {
    useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
    let userAuthCalled = false;
    let adminAuthCalled = false;
    server.use(
      http.get('/api/v1/auth/user-auth', () => {
        userAuthCalled = true;
        return HttpResponse.json({ ok: true });
      }),
      http.get('/api/v1/auth/admin-auth', () => {
        adminAuthCalled = true;
        return HttpResponse.json({ ok: true });
      })
    );
    renderPrivate();

    await waitFor(() => expect(userAuthCalled).toBe(true));
    expect(adminAuthCalled).toBe(false);
  });
});

// ─── AdminRoute.js ────────────────────────────────────────────────────────────
describe('AdminRoute guard', () => {
  it('renders protected content when /admin-auth returns { ok: true }', async () => {
    useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
    server.use(...adminAuthHandlers(true));
    renderAdminRoute();

    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
  });

  it('renders Spinner when /admin-auth returns { ok: false }', async () => {
    useAuth.mockReturnValue([{ token: 'user-token' }, jest.fn()]);
    server.use(...adminAuthHandlers(false));
    renderAdminRoute();

    await waitFor(() =>
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    );
  });

  it('renders Spinner and does not call API when token is absent', async () => {
    useAuth.mockReturnValue([{ token: '' }, jest.fn()]);
    let apiCalled = false;
    server.use(
      http.get('/api/v1/auth/admin-auth', () => {
        apiCalled = true;
        return HttpResponse.json({ ok: true });
      })
    );
    renderAdminRoute();

    await new Promise(r => setTimeout(r, 100));
    expect(apiCalled).toBe(false);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders Spinner while auth check is in flight (loading state)', async () => {
    useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
    let resolveResponse;
    server.use(
      http.get('/api/v1/auth/admin-auth', () =>
        new Promise(resolve => { resolveResponse = resolve; })
      )
    );
    renderAdminRoute();

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // Wait for MSW to intercept the request before resolving
    await waitFor(() => expect(typeof resolveResponse).toBe('function'));
    resolveResponse(HttpResponse.json({ ok: true }));
    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
  });

  it('renders Spinner and does not crash on 401 response', async () => {
    useAuth.mockReturnValue([{ token: 'expired' }, jest.fn()]);
    server.use(
      http.get('/api/v1/auth/admin-auth', () =>
        HttpResponse.json({ ok: false }, { status: 401 })
      )
    );
    expect(() => renderAdminRoute()).not.toThrow();
    await waitFor(() =>
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    );
  });

  it('renders Spinner and does not crash on network error', async () => {
    useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
    server.use(
      http.get('/api/v1/auth/admin-auth', () => HttpResponse.error())
    );
    expect(() => renderAdminRoute()).not.toThrow();
    await new Promise(r => setTimeout(r, 100));
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('calls /api/v1/auth/admin-auth — not /user-auth', async () => {
    useAuth.mockReturnValue([{ token: 'admin-token' }, jest.fn()]);
    let userAuthCalled = false;
    let adminAuthCalled = false;
    server.use(
      http.get('/api/v1/auth/user-auth', () => {
        userAuthCalled = true;
        return HttpResponse.json({ ok: true });
      }),
      http.get('/api/v1/auth/admin-auth', () => {
        adminAuthCalled = true;
        return HttpResponse.json({ ok: true });
      })
    );
    renderAdminRoute();

    await waitFor(() => expect(adminAuthCalled).toBe(true));
    expect(userAuthCalled).toBe(false);
  });
});
