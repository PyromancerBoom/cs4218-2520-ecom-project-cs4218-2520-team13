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
  const mockSetAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User information display', () => {
    it('should display user name from auth.user.name', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email from auth.user.email', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display user address from auth.user.address', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('123 Main St')).toBeInTheDocument();
    });

    it('should display all user information in separate h3 elements', () => {
      const mockUser = {
        name: 'Test User',
        email: 'test@test.com',
        address: '456 Test Ave'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      const { container } = render(<Dashboard />);

      const h3Elements = Array.from(container.querySelectorAll('h3'));
      expect(h3Elements).toHaveLength(3);
      expect(h3Elements[0]).toHaveTextContent('Test User');
      expect(h3Elements[1]).toHaveTextContent('test@test.com');
      expect(h3Elements[2]).toHaveTextContent('456 Test Ave');
    });
  });

  describe('Missing user data handling', () => {
    it('should handle null user gracefully', () => {
      useAuth.mockReturnValue([{ user: null }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    it('should handle undefined user gracefully', () => {
      useAuth.mockReturnValue([{ user: undefined }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    it('should handle partial user data (missing name)', () => {
      const mockUser = {
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
    });

    it('should handle partial user data (missing email)', () => {
      const mockUser = {
        name: 'John Doe',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
    });

    it('should handle partial user data (missing address)', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle empty user object', () => {
      useAuth.mockReturnValue([{ user: {} }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('Layout and structure', () => {
    it('should render UserMenu component', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should use Layout wrapper with correct title "Dashboard - Ecommerce App"', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout-title')).toHaveTextContent('Dashboard - Ecommerce App');
    });

    it('should render within Layout component', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('Card structure', () => {
    it('should display user info within a card container', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      const { container } = render(<Dashboard />);

      const card = container.querySelector('.card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('John Doe');
      expect(card).toHaveTextContent('john@example.com');
      expect(card).toHaveTextContent('123 Main St');
    });
  });

  describe('Auth context usage', () => {
    it('should call useAuth hook', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        address: '123 Main St'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(useAuth).toHaveBeenCalled();
    });

    it('should use first element of useAuth return value (auth object)', () => {
      const mockUser = {
        name: 'Specific User Name',
        email: 'specific@email.com',
        address: 'Specific Address'
      };
      useAuth.mockReturnValue([{ user: mockUser }, mockSetAuth]);

      render(<Dashboard />);

      expect(screen.getByText('Specific User Name')).toBeInTheDocument();
      expect(screen.getByText('specific@email.com')).toBeInTheDocument();
      expect(screen.getByText('Specific Address')).toBeInTheDocument();
    });
  });
});
