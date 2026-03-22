// Lim Yik Seng, A0338506B
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import axios from 'axios';
import CategoryProduct from '../../pages/CategoryProduct';

jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>);

const mockNavigate = jest.fn();
let mockParams = { slug: 'test-category' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate
}));

jest.spyOn(axios, 'get');

const server = setupServer(
  http.get('/api/v1/product/product-category/:slug', () => {
    return HttpResponse.json({
      success: true,
      category: { _id: 'cat-1', name: 'Electronics' },
      products: [
        {
          _id: 'prod-1',
          name: 'Smartphone',
          price: 999,
          description: 'A very smart phone.',
          slug: 'smartphone-slug'
        }
      ]
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { slug: 'test-category' }; 
  jest.spyOn(console, 'log').mockImplementation(() => {}); 
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  jest.restoreAllMocks();
});

const renderComponent = () => render(
  <MemoryRouter>
    <CategoryProduct />
  </MemoryRouter>
);

describe('CategoryProduct Component - Frontend Integration Tests', () => {

  // Lim Yik Seng, A0338506B
  it('does not call API when params.slug is missing', async () => {
    mockParams = {}; 
    renderComponent();
    
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Lim Yik Seng, A0338506B
  it('catches and logs error when API request fails (500 Error)', async () => {
    server.use(
      http.get('/api/v1/product/product-category/:slug', () => HttpResponse.json({}, { status: 500 }))
    );
    renderComponent();

    await waitFor(() => expect(console.log).toHaveBeenCalled());
  });

  // Lim Yik Seng, A0338506B
  it('renders category name, product count, and product details correctly (Happy Path)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
      expect(screen.getByText('1 result found')).toBeInTheDocument();
      
      expect(screen.getByText('Smartphone')).toBeInTheDocument();
      expect(screen.getByText('A very smart phone....')).toBeInTheDocument();
      
      expect(screen.getByText('$999.00')).toBeInTheDocument();
    });
  });

  // Lim Yik Seng, A0338506B
  it('renders default "Category" title when category name is not provided', async () => {
    server.use(
      http.get('/api/v1/product/product-category/:slug', () => {
        return HttpResponse.json({
          success: true,
          category: {}, 
          products: []
        });
      })
    );
    renderComponent();

    await waitFor(() => expect(screen.getByText('Category')).toBeInTheDocument());
  });

  // Lim Yik Seng, A0338506B
  it('displays empty state ("0 result found") when no products exist in category', async () => {
    server.use(
      http.get('/api/v1/product/product-category/:slug', () => {
        return HttpResponse.json({
          success: true,
          category: { name: 'EmptyCat' },
          products: [] 
        });
      })
    );
    renderComponent();

    await waitFor(() => expect(screen.getByText('0 result found')).toBeInTheDocument());
  });

  // Lim Yik Seng, A0338506B
  it('renders product safely even if description is missing', async () => {
    server.use(
      http.get('/api/v1/product/product-category/:slug', () => {
        return HttpResponse.json({
          success: true,
          category: { name: 'Electronics' },
          products: [{ _id: 'prod-2', name: 'No Desc Product', price: 50, slug: 'slug-2' }] // 缺 description
        });
      })
    );
    renderComponent();

    await waitFor(() => expect(screen.getByText('No Desc Product')).toBeInTheDocument());
  });

  // Lim Yik Seng, A0338506B
  it('navigates to product details when More Details is clicked (product has slug)', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Smartphone')).toBeInTheDocument());

    const moreDetailsBtn = screen.getByRole('button', { name: 'More Details' });
    fireEvent.click(moreDetailsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/product/smartphone-slug');
  });

  // Lim Yik Seng, A0338506B
  it('does not navigate when More Details is clicked and product has no slug', async () => {
    server.use(
      http.get('/api/v1/product/product-category/:slug', () => {
        return HttpResponse.json({
          success: true,
          category: { name: 'Electronics' },
          products: [{ _id: 'prod-3', name: 'No Slug Product', price: 50 }] // 缺 slug
        });
      })
    );
    renderComponent();
    await waitFor(() => expect(screen.getByText('No Slug Product')).toBeInTheDocument());

    const moreDetailsBtn = screen.getByRole('button', { name: 'More Details' });
    fireEvent.click(moreDetailsBtn);
    
    expect(mockNavigate).not.toHaveBeenCalled();
  });

});