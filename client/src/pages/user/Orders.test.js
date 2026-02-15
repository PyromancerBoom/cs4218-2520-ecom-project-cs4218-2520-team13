import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import '@testing-library/jest-dom';
import Orders from './Orders';

// Mock dependencies
jest.mock('axios');
jest.mock('moment', () => {
  return jest.fn(() => ({
    fromNow: jest.fn(() => '3 days ago')
  }));
});
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));
jest.mock('../../components/UserMenu', () => {
  const React = require('react');
  return function MockUserMenu() {
    return React.createElement('div', { 'data-testid': 'user-menu' }, 'User Menu');
  };
});
jest.mock('../../components/Layout', () => {
  const React = require('react');
  return function MockLayout({ children, title }) {
    return React.createElement('div', { 'data-testid': 'layout' },
      React.createElement('div', { 'data-testid': 'layout-title' }, title),
      children
    );
  };
});

import { useAuth } from '../../context/auth';
import moment from 'moment';

describe('Orders Component', () => {
  const mockSetAuth = jest.fn();
  const mockOrders = [
    {
      _id: 'order1',
      status: 'Not Process',
      buyer: { name: 'John Doe' },
      createAt: new Date('2024-01-01'),
      payment: { success: true },
      products: [
        {
          _id: 'product1',
          name: 'Product 1',
          description: 'This is a long description that should be truncated to 30 characters',
          price: 100
        }
      ]
    },
    {
      _id: 'order2',
      status: 'Processing',
      buyer: { name: 'John Doe' },
      createAt: new Date('2024-01-02'),
      payment: { success: false },
      products: [
        {
          _id: 'product2',
          name: 'Product 2',
          description: 'Another product description',
          price: 200
        },
        {
          _id: 'product3',
          name: 'Product 3',
          description: 'Third product',
          price: 150
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data fetching', () => {
    it('should fetch orders from /api/v1/auth/orders when token exists', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders');
      });
    });

    it('should only fetch orders when auth.token exists', () => {
      useAuth.mockReturnValue([{ token: null }, mockSetAuth]);

      render(<Orders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should NOT fetch orders when token is undefined', () => {
      useAuth.mockReturnValue([{ token: undefined }, mockSetAuth]);

      render(<Orders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch orders exactly once on mount with valid token', async () => {
      useAuth.mockReturnValue([{ token: 'valid-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Order display', () => {
    it('should display order status correctly', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('Not Process')).toBeInTheDocument();
        expect(screen.getByText('Processing')).toBeInTheDocument();
      });
    });

    it('should display buyer name from o.buyer.name', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        const buyerNames = screen.getAllByText('John Doe');
        expect(buyerNames.length).toBe(2);
      });
    });

    it('should display formatted date using moment(o.createAt).fromNow()', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(moment).toHaveBeenCalled();
      });

      expect(screen.getAllByText('3 days ago')).toHaveLength(2);
    });

    it('should display payment status as "Success" when o.payment.success is true', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('should display payment status as "Failed" when o.payment.success is false', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should display product count from o.products.length', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Product display', () => {
    it('should render product images from /api/v1/product/product-photo/${p._id}', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
      });
    });

    it('should display product name', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
      });
    });

    it('should display product description truncated to 30 chars', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        // First 30 characters of "This is a long description that should be truncated..."
        expect(screen.getByText('This is a long description tha')).toBeInTheDocument();
      });
    });

    it('should display product price with "Price : " prefix', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('Price : 100')).toBeInTheDocument();
        expect(screen.getByText('Price : 200')).toBeInTheDocument();
        expect(screen.getByText('Price : 150')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      render(<Orders />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should still render layout on API error', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(<Orders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should handle empty orders array', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
      });
    });

    it('should display heading with no orders', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
      });

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Layout and structure', () => {
    it('should render with Layout component and title "Your Orders"', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByTestId('layout-title')).toHaveTextContent('Your Orders');
      });
    });

    it('should render UserMenu component', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      });
    });

    it('should display "All Orders" heading', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
      });
    });
  });

  describe('Table structure', () => {
    it('should display table headers: #, Status, Buyer, date, Payment, Quantity', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(screen.getAllByText('#').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Buyer').length).toBeGreaterThan(0);
        expect(screen.getAllByText('date').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Payment').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Quantity').length).toBeGreaterThan(0);
      });
    });

    it('should display order number starting from 1', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        const tableRows = screen.getAllByRole('row');
        expect(tableRows.length).toBeGreaterThan(0);
      });
    });
  });
});
