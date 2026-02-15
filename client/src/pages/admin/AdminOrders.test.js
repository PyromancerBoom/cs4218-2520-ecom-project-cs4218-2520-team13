import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
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
import moment from 'moment';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data fetching', () => {
    it('should fetch orders from /api/v1/auth/all-orders when admin token exists', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
      });
    });

    it('should only fetch when auth.token exists', () => {
      useAuth.mockReturnValue([{ token: null }, mockSetAuth]);

      render(<AdminOrders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should NOT fetch when token is undefined', () => {
      useAuth.mockReturnValue([{ token: undefined }, mockSetAuth]);

      render(<AdminOrders />);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should fetch when auth object is truthy with token', async () => {
      useAuth.mockReturnValue([{ token: 'valid-token', user: { name: 'Admin' } }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
      });
    });
  });

  describe('Order display', () => {
    it('should display all orders from all users', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display buyer name from o.buyer.name', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display formatted date using moment(o.createAt).fromNow()', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(moment).toHaveBeenCalled();
      });

      expect(screen.getAllByText('2 days ago')).toHaveLength(2);
    });

    it('should display payment status as "Success" when payment.success is true', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('should display payment status as "Failed" when payment.success is false', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });
    });

    it('should display product count from o.products.length', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        // First order has 1 product, second has 2
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Status dropdown', () => {
    it('should display order status in a Select dropdown', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        const selects = screen.getAllByTestId('status-select');
        expect(selects.length).toBe(2);
      });
    });

    it('should set defaultValue to current order status', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        const selects = screen.getAllByTestId('status-select');
        expect(selects[0]).toHaveValue('Not Process');
        expect(selects[1]).toHaveValue('Processing');
      });
    });

    it('should have bordered={false} on Select component', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        const selects = screen.getAllByTestId('status-select');
        expect(selects[0]).toHaveAttribute('data-bordered', 'false');
      });
    });

    it('should have all status options: Not Process, Processing, Shipped, deliverd, cancel', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        const select = screen.getAllByTestId('status-select')[0];
        const options = select.querySelectorAll('option');
        const optionValues = Array.from(options).map(opt => opt.value);

        expect(optionValues).toContain('Not Process');
        expect(optionValues).toContain('Processing');
        expect(optionValues).toContain('Shipped');
        expect(optionValues).toContain('deliverd');
        expect(optionValues).toContain('cancel');
      });
    });
  });

  describe('Status change handling', () => {
    it('should call /api/v1/auth/order-status/${orderId} with PUT method when status changes', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValue({ data: mockOrders });
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getAllByTestId('status-select').length).toBeGreaterThan(0);
      });

      const select = screen.getAllByTestId('status-select')[0];
      fireEvent.change(select, { target: { value: 'Processing' } });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          '/api/v1/auth/order-status/order1',
          { status: 'Processing' }
        );
      });
    });

    it('should send status in request body as { status: value }', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValue({ data: mockOrders });
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getAllByTestId('status-select').length).toBeGreaterThan(0);
      });

      const select = screen.getAllByTestId('status-select')[0];
      fireEvent.change(select, { target: { value: 'Shipped' } });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          expect.any(String),
          { status: 'Shipped' }
        );
      });
    });

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
      fireEvent.change(select, { target: { value: 'Shipped' } });

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(initialGetCalls);
      });
    });

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
      fireEvent.change(select, { target: { value: 'cancel' } });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Product display', () => {
    it('should display product images with correct src', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
      });
    });

    it('should display product name', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });

    it('should display truncated product description (30 chars)', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        // "A long description that needs" is 30 chars of original description
        expect(screen.getByText('A long description that needs ')).toBeInTheDocument();
      });
    });

    it('should display product price', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('Price : 100')).toBeInTheDocument();
        expect(screen.getByText('Price : 200')).toBeInTheDocument();
      });
    });
  });

  describe('Layout and structure', () => {
    it('should render with Layout component and title "All Orders Data"', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders Data')).toBeInTheDocument();
      });
    });

    it('should render AdminMenu component', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
      });
    });

    it('should display "All Orders" heading', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: mockOrders });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should handle empty orders array', async () => {
      useAuth.mockReturnValue([{ token: 'admin-token' }, mockSetAuth]);
      axios.get.mockResolvedValueOnce({ data: [] });

      render(<AdminOrders />);

      await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('status-select')).not.toBeInTheDocument();
    });
  });
});
