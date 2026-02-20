import React from 'react';
import { render, waitFor, screen, fireEvent, act } from '@testing-library/react';
import axios from 'axios';
import '@testing-library/jest-dom';
import AdminOrders from './AdminOrders';

// Mock dependencies
jest.mock('axios');
jest.mock('moment', () => {
  return jest.fn(() => ({
    fromNow: jest.fn(() => '2 days ago')
  }));
});
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn()
}));
jest.mock('../../components/AdminMenu', () => {
  const React = require('react');
  return function MockAdminMenu() {
    return React.createElement('div', { 'data-testid': 'admin-menu' }, 'Admin Menu');
  };
});
jest.mock('../../components/Layout', () => {
  const React = require('react');
  return function MockLayout({ children, title }) {
    return React.createElement('div', { 'data-testid': 'layout' },
      React.createElement('h1', null, title),
      children
    );
  };
});

// Mock antd Select component
jest.mock('antd', () => {
  const React = require('react');
  const MockSelect = ({ children, onChange, defaultValue, bordered }) => {
    return React.createElement('select', {
      'data-testid': 'status-select',
      onChange: (e) => onChange(e.target.value),
      defaultValue: defaultValue,
      'data-bordered': bordered ? 'true' : 'false'
    }, children);
  };
  MockSelect.Option = ({ children, value }) => {
    return React.createElement('option', { value }, children);
  };
  return { Select: MockSelect };
});

import { useAuth } from '../../context/auth';

// Wei Sheng, A0259272X
describe('AdminOrders Component', () => {
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
          description: 'A long description that needs to be truncated for display',
          price: 100
        }
      ]
    },
    {
      _id: 'order2',
      status: 'Processing',
      buyer: { name: 'Jane Smith' },
      createAt: new Date('2024-01-02'),
      payment: { success: false },
      products: [
        {
          _id: 'product2',
          name: 'Product 2',
          description: 'Another description',
          price: 200
        },
        {
          _id: 'product3',
          name: 'Product 3',
          description: 'Third product description',
          price: 150
        }
      ]
    }
  ];

  // Helper: renders AdminOrders with a valid auth token and waits for orders to load
  const renderWithOrders = async (orders = mockOrders) => {
    useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
    axios.get.mockResolvedValueOnce({ data: orders });
    await act(async () => {
      render(<AdminOrders />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data fetching', () => {
    // Wei Sheng, A0259272X
    it('should fetch orders from /api/v1/auth/all-orders when admin token exists', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    // Wei Sheng, A0259272X
    it.each([null, undefined])('should not fetch when auth.token is %s', (tokenValue) => {
      useAuth.mockReturnValue([{ token: tokenValue }, mockSetAuth]);

      render(<AdminOrders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    // Wei Sheng, A0259272X
    it('should log error when fetching orders fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockRejectedValueOnce(new Error('Fetch failed'));

      render(<AdminOrders />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });

  describe('Order display', () => {
    // Wei Sheng, A0259272X
    it('should display all orders from all users', async () => {
      await renderWithOrders();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display formatted date using moment(o.createAt).fromNow()', async () => {
      await renderWithOrders();
      expect(screen.getAllByText('2 days ago')).toHaveLength(2);
    });

    // Wei Sheng, A0259272X
    it('should display payment status as "Success" when payment.success is true', async () => {
      await renderWithOrders();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display payment status as "Failed" when payment.success is false', async () => {
      await renderWithOrders();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display payment status as "Failed" when payment is null', async () => {
      const ordersWithNullPayment = [{ ...mockOrders[0], payment: null }];
      await renderWithOrders(ordersWithNullPayment);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display product count from o.products.length', async () => {
      await renderWithOrders();
      // First order has 1 product, second has 2
      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('2')[0]).toBeInTheDocument();
    });
  });

  describe('Status dropdown', () => {
    // Wei Sheng, A0259272X
    it('should render one status dropdown per order', async () => {
      await renderWithOrders();
      const selects = screen.getAllByTestId('status-select');
      expect(selects.length).toBe(2);
    });

    // Wei Sheng, A0259272X
    it('should set defaultValue to current order status', async () => {
      await renderWithOrders();
      const selects = screen.getAllByTestId('status-select');
      expect(selects[0]).toHaveValue('Not Process');
      expect(selects[1]).toHaveValue('Processing');
    });

    // Wei Sheng, A0259272X
    it('should have bordered={false} on Select component', async () => {
      await renderWithOrders();
      const selects = screen.getAllByTestId('status-select');
      expect(selects[0]).toHaveAttribute('data-bordered', 'false');
    });

    // Wei Sheng, A0259272X
    it('should have all status options: Not Process, Processing, Shipped, delivered, cancel', async () => {
      await renderWithOrders();
      const select = screen.getAllByTestId('status-select')[0];
      const options = select.querySelectorAll('option');
      const optionValues = Array.from(options).map(opt => opt.value);

      expect(optionValues).toContain('Not Process');
      expect(optionValues).toContain('Processing');
      expect(optionValues).toContain('Shipped');
      expect(optionValues).toContain('delivered');
      expect(optionValues).toContain('cancel');
    });
  });

  describe('Status change handling', () => {
    // Wei Sheng, A0259272X
    it('should call /api/v1/auth/order-status/${orderId} with PUT method when status changes', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValue({ data: mockOrders });
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getAllByTestId('status-select').length).toBeGreaterThan(0);
      });

      const select = screen.getAllByTestId('status-select')[0];

      await act(async () => {
        fireEvent.change(select, { target: { value: 'Processing' } });
      });

      expect(axios.put).toHaveBeenCalledWith(
        '/api/v1/auth/order-status/order1',
        { status: 'Processing' }
      );
    });

    // Wei Sheng, A0259272X
    it('should call getOrders() to refresh after successful status update', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValue({ data: mockOrders });
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getAllByTestId('status-select').length).toBeGreaterThan(0);
      });

      const initialGetCalls = axios.get.mock.calls.length;

      const select = screen.getAllByTestId('status-select')[0];

      await act(async () => {
        fireEvent.change(select, { target: { value: 'Shipped' } });
      });

      expect(axios.get.mock.calls.length).toBeGreaterThan(initialGetCalls);
    });

    // Wei Sheng, A0259272X
    it('should log error on status update failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValue({ data: mockOrders });
      axios.put.mockRejectedValueOnce(new Error('Update failed'));

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getAllByTestId('status-select').length).toBeGreaterThan(0);
      });

      const select = screen.getAllByTestId('status-select')[0];

      await act(async () => {
        fireEvent.change(select, { target: { value: 'cancel' } });
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Product display', () => {
    // Wei Sheng, A0259272X
    it('should display product images with correct src', async () => {
      await renderWithOrders();
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
    });

    // Wei Sheng, A0259272X
    it('should display product name', async () => {
      await renderWithOrders();
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display truncated product description (30 chars)', async () => {
      await renderWithOrders();
      // substring(0, 30) of the description = "A long description that needs "
      expect(screen.getByText(/^A long description that needs\s*$/)).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display product price', async () => {
      await renderWithOrders();
      expect(screen.getByText('Price : 100')).toBeInTheDocument();
      expect(screen.getByText('Price : 200')).toBeInTheDocument();
    });
  });

  describe('Layout and structure', () => {
    // Wei Sheng, A0259272X
    it('should render with Layout component and title "All Orders Data"', async () => {
      await renderWithOrders();
      expect(screen.getByText('All Orders Data')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should render AdminMenu component', async () => {
      await renderWithOrders();
      expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    });

    // Wei Sheng, A0259272X
    it('should display "All Orders" heading', async () => {
      await renderWithOrders();
      expect(screen.getByText('All Orders')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    // Wei Sheng, A0259272X
    it('should handle empty orders array', async () => {
      await renderWithOrders([]);
      expect(screen.getByText('All Orders')).toBeInTheDocument();
      expect(screen.queryByTestId('status-select')).not.toBeInTheDocument();
    });
  });
});
