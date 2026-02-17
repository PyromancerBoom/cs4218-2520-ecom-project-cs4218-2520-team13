import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { useAuth } from '../../context/auth';

// Mock dependencies
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));
jest.mock('../../components/UserMenu', () => {
  return function MockUserMenu() {
    return <div data-testid="user-menu">User Menu</div>;
  };
});
jest.mock('../../components/Layout', () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout">
        <div data-testid="layout-title">{title}</div>
        {children}
      </div>
    );
  };
});

describe('Dashboard Component', () => {
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com',
    address: '123 Main St'
  };
  const mockSetAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);
  });

  describe('User information display', () => {
    // Wei Sheng, A0259272X
    it('renders all user info in h3 headings when auth.user is present', () => {
      render(<Dashboard />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveTextContent('John Doe');
      expect(headings[1]).toHaveTextContent('john@example.com');
      expect(headings[2]).toHaveTextContent('123 Main St');
    });
  });

  describe('Missing user data handling', () => {
    // Wei Sheng, A0259272X
    it.each([
      ['null', null],
      ['an empty object', {}],
    ])('renders without crashing when user is %s', (_, user) => {
      useAuth.mockReturnValue([{ user }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it.each([
      ['missing name', { email: 'john@example.com', address: '123 Main St' }, ['john@example.com', '123 Main St']],
      ['missing email', { name: 'John Doe', address: '123 Main St' }, ['John Doe', '123 Main St']],
      ['missing address', { name: 'John Doe', email: 'john@example.com' }, ['John Doe', 'john@example.com']],
    ])('still renders available fields when user has %s', (_, user, expectedTexts) => {
      useAuth.mockReturnValue([{ user }, mockSetAuth]);

      render(<Dashboard />);

      expectedTexts.forEach(text => expect(screen.getByText(text)).toBeInTheDocument());
    });
  });

  describe('Layout and structure', () => {
    // Wei Sheng, A0259272X
    it('uses Layout wrapper with title "Dashboard - Ecommerce App"', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('layout-title')).toHaveTextContent('Dashboard - Ecommerce App');
    });

    // Wei Sheng, A0259272X
    it('renders UserMenu regardless of user state', () => {
      useAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });
});
