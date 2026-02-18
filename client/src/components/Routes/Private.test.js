import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import '@testing-library/jest-dom';
import PrivateRoute from './Private';

// Mock dependencies
jest.mock('axios');
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));
jest.mock('../Spinner', () => {
  const React = require('react');
  return function MockSpinner({ path }) {
    return React.createElement('div', { 'data-testid': 'spinner' }, `Loading... Redirecting to ${path}`);
  };
});
// Mock mongoose set import that's unused in the component
jest.mock('mongoose', () => ({
  set: jest.fn()
}));

import { useAuth } from '../../context/auth';

describe('PrivateRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state (no token)', () => {

    // Wei Sheng, A0259272X
    it('should show spinner when user is not logged in (no token)', () => {
      useAuth.mockReturnValue([{ token: null }, jest.fn()]);

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should NOT call user-auth endpoint when token is missing', () => {
      useAuth.mockReturnValue([{ token: null }, jest.fn()]);

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(axios.get).not.toHaveBeenCalled();
    });

  });

  describe('API authentication check', () => {

    // Wei Sheng, A0259272X
    it('should call /api/v1/auth/user-auth endpoint exactly once when valid token exists', async () => {
      useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
      axios.get.mockResolvedValueOnce({ data: { ok: true } });

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/user-auth');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Successful authentication (ok: true)', () => {

    // Wei Sheng, A0259272X
    it('should render Outlet and hide spinner when user-auth returns ok: true', async () => {
      useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
      axios.get.mockResolvedValueOnce({ data: { ok: true } });

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Failed authentication (ok: false)', () => {

    // Wei Sheng, A0259272X
    it('should show spinner and not render protected content when user-auth returns ok: false', async () => {
      useAuth.mockReturnValue([{ token: 'invalid-token' }, jest.fn()]);
      axios.get.mockResolvedValueOnce({ data: { ok: false } });

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('API error handling', () => {

    // Wei Sheng, A0259272X
    it('should show spinner and not render protected content when user-auth endpoint throws', async () => {
      useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
      axios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Spinner path configuration', () => {

    // Wei Sheng, A0259272X
    it('should pass empty path to Spinner component', () => {
      useAuth.mockReturnValue([{ token: null }, jest.fn()]);

      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      const spinner = screen.getByTestId('spinner');
      expect(spinner.textContent).toBe('Loading... Redirecting to ');
    });
  });

  describe('Token dependency', () => {

    // Wei Sheng, A0259272X
    it('should show spinner and not call API when token is removed (logout)', async () => {
      const mockSetAuth = jest.fn();

      // First render with valid token, auth succeeds
      useAuth.mockReturnValue([{ token: 'valid-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: { ok: true } });

      const { rerender } = render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      // Simulate logout: token is removed
      useAuth.mockReturnValue([{ token: null }, mockSetAuth]);

      rerender(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });

      // API should not be called again after token removal
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    // Wei Sheng, A0259272X
    it('should re-check auth when token changes', async () => {
      const mockSetAuth = jest.fn();

      // First render with no token
      useAuth.mockReturnValue([{ token: null }, mockSetAuth]);

      const { rerender } = render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(axios.get).not.toHaveBeenCalled();

      // Re-render with token
      useAuth.mockReturnValue([{ token: 'new-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: { ok: true } });

      rerender(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<PrivateRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/user-auth');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });
});
