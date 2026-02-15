import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '@testing-library/jest-dom';
import Products from './Products';

// Mock dependencies
jest.mock('axios');
jest.mock('react-hot-toast');
jest.mock('../../components/AdminMenu', () => {
  return function MockAdminMenu() {
    return <div data-testid="admin-menu">Admin Menu</div>;
  };
});
jest.mock('../../components/Layout', () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to} data-testid="product-link">{children}</a>
}));

describe('Products Component', () => {
  const mockProducts = [
    {
      _id: 'product1',
      name: 'Product 1',
      description: 'Description for product 1',
      slug: 'product-1'
    },
    {
      _id: 'product2',
      name: 'Product 2',
      description: 'Description for product 2',
      slug: 'product-2'
    },
    {
      _id: 'product3',
      name: 'Product 3',
      description: 'Description for product 3',
      slug: 'product-3'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data fetching', () => {
    it('should fetch products from /api/v1/product/get-product on mount', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product');
      });
    });

    it('should fetch products exactly once on mount', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Product display', () => {
    it('should display products from data.products', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
      });
    });

    it('should display product name from p.name', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        mockProducts.forEach(product => {
          expect(screen.getByText(product.name)).toBeInTheDocument();
        });
      });
    });

    it('should display product description from p.description', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('Description for product 1')).toBeInTheDocument();
        expect(screen.getByText('Description for product 2')).toBeInTheDocument();
        expect(screen.getByText('Description for product 3')).toBeInTheDocument();
      });
    });

    it('should render product cards with images', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBe(3);
      });
    });

    it('should format product image src as /api/v1/product/product-photo/${p._id}', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
        expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/product2');
        expect(images[2]).toHaveAttribute('src', '/api/v1/product/product-photo/product3');
      });
    });

    it('should set alt attribute to product name', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images[0]).toHaveAttribute('alt', 'Product 1');
        expect(images[1]).toHaveAttribute('alt', 'Product 2');
        expect(images[2]).toHaveAttribute('alt', 'Product 3');
      });
    });
  });

  describe('Product links', () => {
    it('should link to /dashboard/admin/product/${p.slug} when clicked', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        const links = screen.getAllByTestId('product-link');
        expect(links[0]).toHaveAttribute('href', '/dashboard/admin/product/product-1');
        expect(links[1]).toHaveAttribute('href', '/dashboard/admin/product/product-2');
        expect(links[2]).toHaveAttribute('href', '/dashboard/admin/product/product-3');
      });
    });

    it('should have unique key for each product link', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        const links = screen.getAllByTestId('product-link');
        expect(links.length).toBe(3);
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast when API call fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      render(<Products />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Someething Went Wrong');
      });
    });

    it('should log error to console when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      render(<Products />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Empty state', () => {
    it('should handle empty products array', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: [] } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('All Products List')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('product-link')).not.toBeInTheDocument();
    });

    it('should display heading even with no products', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: [] } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('All Products List')).toBeInTheDocument();
      });
    });
  });

  describe('Layout and structure', () => {
    it('should render AdminMenu component', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
      });
    });

    it('should display "All Products List" heading', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByText('All Products List')).toBeInTheDocument();
      });
    });

    it('should render within Layout component', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      render(<Products />);

      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });
    });
  });

  describe('Product card structure', () => {
    it('should render product cards with correct CSS classes', async () => {
      axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

      const { container } = render(<Products />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.card');
        expect(cards.length).toBe(3);
      });
    });
  });
});
