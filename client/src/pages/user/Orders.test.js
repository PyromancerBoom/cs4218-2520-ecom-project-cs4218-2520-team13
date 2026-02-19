import React from 'react';
import { render, waitFor, screen, within } from '@testing-library/react';
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

// Wei Sheng, A0259272X
describe('Orders Component', () => {
  const mockSetAuth = jest.fn();
  // order1: index=0 → order number=1, 1 product (count=1)
  // order2: index=1 → order number=2, 3 products (count=3); count differs from number for unambiguous scoped assertions
  const mockOrders = [
    {
      _id: 'order1',
      status: 'Not Process',
      buyer: { name: 'Alice' },
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
      buyer: { name: 'Bob' },
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
        },
        {
          _id: 'product4',
          name: 'Product 4',
          description: 'Fourth product',
          price: 300
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data fetching', () => {

    // Wei Sheng, A0259272X
    it('should fetch orders from /api/v1/auth/orders exactly once on mount when token exists', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    // Wei Sheng, A0259272X
    it('should not fetch orders when token does not exist', () => {
      useAuth.mockReturnValue([{ token: null }, mockSetAuth]);

      render(<Orders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    // Wei Sheng, A0259272X
    it('should not fetch orders when token is undefined', () => {
      useAuth.mockReturnValue([{ token: undefined }, mockSetAuth]);

      render(<Orders />);

      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('Order display', () => {

    // Wei Sheng, A0259272X
    it('should display order status from o.status', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await screen.findByText('Not Process');
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display buyer name from o.buyer.name', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await screen.findByText('Alice');
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display formatted date from o.createAt using moment(o.createAt).fromNow()', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      expect(await screen.findAllByText('3 days ago')).toHaveLength(2);
      expect(moment).toHaveBeenCalledWith(mockOrders[0].createAt);
      expect(moment).toHaveBeenCalledWith(mockOrders[1].createAt);
    });

    // Wei Sheng, A0259272X
    // Uses a single-order mock so "Success" and "Failed" cannot both be in the DOM simultaneously
    it('should display payment status as "Success" when o.payment.success is true', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [mockOrders[0]] });

      render(<Orders />);

      await screen.findByText('Success');
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    // Uses a single-order mock so "Success" and "Failed" cannot both be in the DOM simultaneously
    it('should display payment status as "Failed" when o.payment.success is false', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [mockOrders[1]] });

      render(<Orders />);

      await screen.findByText('Failed');
      expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display product count from o.products.length', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      const tables = await screen.findAllByRole('table');
      // order1 has 1 product; order2 has 3 products ('3' is unique in that table)
      expect(within(tables[0]).getAllByText('1')[0]).toBeInTheDocument();
      expect(within(tables[1]).getByText('3')).toBeInTheDocument();
    });
  });

  describe('Product display', () => {

    // Wei Sheng, A0259272X
    it('should render product images from /api/v1/product/product-photo/${p._id}', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      const images = await screen.findAllByRole('img');
      expect(images).toHaveLength(4);
      expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
      expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/product2');
      expect(images[2]).toHaveAttribute('src', '/api/v1/product/product-photo/product3');
      expect(images[3]).toHaveAttribute('src', '/api/v1/product/product-photo/product4');
    });

    // Wei Sheng, A0259272X
    it('should display product name', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await screen.findByText('Product 1');
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
      expect(screen.getByText('Product 4')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display product description truncated to 30 chars', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      // First 30 characters of "This is a long description that should be truncated..."
      expect(await screen.findByText('This is a long description tha')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display product price with "Price : " prefix', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      await screen.findByText('Price : 100');
      expect(screen.getByText('Price : 200')).toBeInTheDocument();
      expect(screen.getByText('Price : 150')).toBeInTheDocument();
      expect(screen.getByText('Price : 300')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {

    // Wei Sheng, A0259272X
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

    // Wei Sheng, A0259272X
    it('should still render layout and UserMenu on API error', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(<Orders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Empty state', () => {

    // Wei Sheng, A0259272X
    it('should display "All Orders" heading and UserMenu with no orders, and render no table', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<Orders />);

      await screen.findByText('All Orders');
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Layout and structure', () => {

    // Wei Sheng, A0259272X
    it('should render with Layout component and title "Your Orders"', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      expect(await screen.findByTestId('layout-title')).toHaveTextContent('Your Orders');
    });

    // Wei Sheng, A0259272X
    it('should render UserMenu component', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      expect(await screen.findByTestId('user-menu')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display "All Orders" heading', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      expect(await screen.findByText('All Orders')).toBeInTheDocument();
    });
  });

  describe('Table structure', () => {

    // Wei Sheng, A0259272X
    it('should display table headers: #, Status, Buyer, date, Payment, Quantity', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      const [firstTable] = await screen.findAllByRole('table');
      expect(within(firstTable).getByRole('columnheader', { name: '#' })).toBeInTheDocument();
      expect(within(firstTable).getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(within(firstTable).getByRole('columnheader', { name: 'Buyer' })).toBeInTheDocument();
      expect(within(firstTable).getByRole('columnheader', { name: 'date' })).toBeInTheDocument();
      expect(within(firstTable).getByRole('columnheader', { name: 'Payment' })).toBeInTheDocument();
      expect(within(firstTable).getByRole('columnheader', { name: 'Quantity' })).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display 1-based index as order number for each order', async () => {
      useAuth.mockReturnValue([{ token: 'user-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<Orders />);

      const tables = await screen.findAllByRole('table');
      expect(tables).toHaveLength(2);
      // First order is numbered 1 (i + 1 where i = 0)
      expect(within(tables[0]).getAllByText('1')[0]).toBeInTheDocument();
      // Second order is numbered 2 (i + 1 where i = 1); '2' is unique in this table since product count is 3
      expect(within(tables[1]).getByText('2')).toBeInTheDocument();
    });
  });
});
