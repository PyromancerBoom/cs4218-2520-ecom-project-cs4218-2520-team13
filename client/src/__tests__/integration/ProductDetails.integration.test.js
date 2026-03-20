// Lim Yik Seng, A0338506B
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import axios from 'axios';
import toast from 'react-hot-toast';
import ProductDetails from '../../pages/ProductDetails';
import { useCart } from '../../context/cart';

jest.mock('../../context/cart', () => ({
  useCart: jest.fn()
}));
jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('react-hot-toast');

const mockNavigate = jest.fn();
let mockParams = { slug: 'test-product' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockParams,
  useNavigate: () => mockNavigate
}));

const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
jest.spyOn(axios, 'get');

const server = setupServer(
  http.get('/api/v1/product/get-product/:slug', () => {
    return HttpResponse.json({
      success: true,
      product: {
        _id: 'prod-1',
        name: 'Main Product',
        description: 'Main Description',
        price: 100,
        category: { _id: 'cat-1', name: 'Electronics' }
      }
    });
  }),
  http.get('/api/v1/product/related-product/:pid/:cid', () => {
    return HttpResponse.json({
      success: true,
      products: [
        {
          _id: 'prod-2',
          name: 'Related Product',
          description: 'Related Description',
          price: 50,
          slug: 'related-slug'
        }
      ]
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { slug: 'test-product' }; 
  useCart.mockReturnValue([[], jest.fn()]); 
  jest.spyOn(console, 'log').mockImplementation(() => {}); 
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  jest.restoreAllMocks();
});

const renderComponent = () => render(
  <MemoryRouter>
    <ProductDetails />
  </MemoryRouter>
);

describe('ProductDetails Component - Frontend Integration Tests', () => {

  // Lim Yik Seng, A0338506B
  it('does not call getProduct when params.slug is missing', async () => {
    mockParams = {}; 
    renderComponent();
    
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Lim Yik Seng, A0338506B
  it('fetches and renders main product and similar products correctly (Happy Path)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Name : Main Product')).toBeInTheDocument();
      expect(screen.getByText('Description : Main Description')).toBeInTheDocument();
      expect(screen.getByText('Category : Electronics')).toBeInTheDocument();
      expect(screen.getByText('Price :$100.00')).toBeInTheDocument();
      expect(screen.getByText('Related Product')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });

  // Lim Yik Seng, A0338506B
  it('does not fetch similar products if main product is missing category._id', async () => {
    server.use(
      http.get('/api/v1/product/get-product/:slug', () => {
        return HttpResponse.json({
          success: true,
          product: { _id: 'prod-1', name: 'No Category Product' } 
        });
      })
    );
    renderComponent();

    await waitFor(() => expect(screen.getByText('Name : No Category Product')).toBeInTheDocument());

    expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining('/related-product/'));
  });

  // Lim Yik Seng, A0338506B
  it('catches and logs error when getProduct API fails', async () => {
    server.use(
      http.get('/api/v1/product/get-product/:slug', () => HttpResponse.json({}, { status: 500 }))
    );
    renderComponent();

    await waitFor(() => expect(console.log).toHaveBeenCalled());
  });

  // Lim Yik Seng, A0338506B
  it('catches and logs error when getSimilarProduct API fails', async () => {
    server.use(
      http.get('/api/v1/product/related-product/:pid/:cid', () => HttpResponse.json({}, { status: 500 }))
    );
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Name : Main Product')).toBeInTheDocument();
      expect(console.log).toHaveBeenCalled();
    });
  });

  // Lim Yik Seng, A0338506B
  it('displays "No Similar Products found" when related products array is empty', async () => {
    server.use(
      http.get('/api/v1/product/related-product/:pid/:cid', () => {
        return HttpResponse.json({ success: true, products: [] });
      })
    );
    renderComponent();

    await waitFor(() => expect(screen.getByText('No Similar Products found')).toBeInTheDocument());
  });

  // Lim Yik Seng, A0338506B
  it('renders related product safely even if description is missing', async () => {
    server.use(
      http.get('/api/v1/product/related-product/:pid/:cid', () => {
        return HttpResponse.json({
          success: true,
          products: [{ _id: 'prod-2', name: 'No Desc Product', price: 50 }] 
        });
      })
    );
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No Desc Product')).toBeInTheDocument();
    });
  });

  // Lim Yik Seng, A0338506B
  it('adds main product to cart and localStorage when ADD TO CART is clicked', async () => {
    const mockSetCart = jest.fn();
    useCart.mockReturnValue([[], mockSetCart]);

    renderComponent();
    await waitFor(() => expect(screen.getByText('Name : Main Product')).toBeInTheDocument());

    const addToCartBtns = screen.getAllByText('ADD TO CART');
    fireEvent.click(addToCartBtns[0]);

    expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ name: 'Main Product' })]);
    expect(mockSetItem).toHaveBeenCalledWith('cart', expect.any(String));
    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  });

  // Lim Yik Seng, A0338506B
  it('adds related product to cart when its ADD TO CART is clicked', async () => {
    const mockSetCart = jest.fn();
    useCart.mockReturnValue([[], mockSetCart]);

    renderComponent();
    await waitFor(() => expect(screen.getByText('Related Product')).toBeInTheDocument());

    const addToCartBtns = screen.getAllByText('ADD TO CART');
    fireEvent.click(addToCartBtns[1]); 

    expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ name: 'Related Product' })]);
    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  });

  // Lim Yik Seng, A0338506B
  it('navigates to product details when More Details is clicked (with slug)', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Related Product')).toBeInTheDocument());

    fireEvent.click(screen.getByText('More Details'));
    expect(mockNavigate).toHaveBeenCalledWith('/product/related-slug');
  });

  // Lim Yik Seng, A0338506B
  it('does not navigate when More Details is clicked if product has no slug', async () => {
    server.use(
      http.get('/api/v1/product/related-product/:pid/:cid', () => {
        return HttpResponse.json({
          success: true,
          products: [{ _id: 'prod-2', name: 'No Slug Product', price: 50 }]
        });
      })
    );
    renderComponent();
    await waitFor(() => expect(screen.getByText('No Slug Product')).toBeInTheDocument());

    fireEvent.click(screen.getByText('More Details'));
    expect(mockNavigate).not.toHaveBeenCalled(); 
  });

});