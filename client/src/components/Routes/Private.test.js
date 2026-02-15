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

    it('should show spinner when auth state is empty', () => {
      useAuth.mockReturnValue([{}, jest.fn()]);

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

    it('should NOT call user-auth endpoint when token is undefined', () => {
      useAuth.mockReturnValue([{ token: undefined }, jest.fn()]);

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
    it('should call /api/v1/auth/user-auth endpoint when valid token exists', async () => {
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
      });
    });

    it('should call user-auth endpoint exactly once per render with token', async () => {
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
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Successful authentication (ok: true)', () => {
    it('should render Outlet (protected content) when user-auth returns ok: true', async () => {
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
      });
    });

    it('should hide spinner after successful authentication', async () => {
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
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Failed authentication (ok: false)', () => {
    it('should show spinner when user-auth returns ok: false', async () => {
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
      });
    });

    it('should NOT render protected content when ok: false', async () => {
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
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('API error handling', () => {
    it('should show spinner when user-auth endpoint returns error', async () => {
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
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should NOT render protected content on API error', async () => {
      useAuth.mockReturnValue([{ token: 'token' }, jest.fn()]);
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

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
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Spinner path configuration', () => {
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
      expect(spinner).toHaveTextContent('Redirecting to');
    });
  });

  describe('Token dependency', () => {
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
      });
    });
  });
});
