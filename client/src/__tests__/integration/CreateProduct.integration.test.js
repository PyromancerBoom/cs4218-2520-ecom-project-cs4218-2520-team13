// Lim Yik Seng, A0338506B
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import toast from 'react-hot-toast';
import CreateProduct from '../../pages/admin/CreateProduct';
import axios from 'axios';

// Mock Context & Components
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: { name: 'Admin', role: 1 }, token: 'admin-token' }, jest.fn()])
}));
jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/AdminMenu', () => () => <div>AdminMenu</div>);

// Mock react-hot-toast
jest.mock('react-hot-toast');

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock URL.createObjectURL for photo testing later
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'mocked-image-url');
});

// Setup MSW Server (初始只放 Happy Path 的 Category API)
const server = setupServer(
  http.get('/api/v1/category/get-category', () => {
    return HttpResponse.json({
      success: true,
      category: [
        { _id: 'cat-1', name: 'Electronics' },
        { _id: 'cat-2', name: 'Books' }
      ]
    });
  }),

  http.post('/api/v1/product/create-product', () => {
    return HttpResponse.json({ 
      success: true, 
      message: 'Product Created Successfully' 
    }, { status: 201 });
  })
);

// Test Lifecycle Hooks
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  axios.defaults.headers.common['Authorization'] = 'admin-token';
  jest.clearAllMocks();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
  jest.restoreAllMocks();
});

// Helper function to render component
const renderCreateProduct = () => render(
  <MemoryRouter>
    <CreateProduct />
  </MemoryRouter>
);

describe('CreateProduct Component - Frontend Integration', () => {

  // Lim Yik Seng, A0338506B
  it('renders the form and fetches categories successfully on mount', async () => {
    renderCreateProduct();

    expect(screen.getByText('Create Product')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Select a category')).toBeInTheDocument();
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when category API returns success: false', async () => {
    server.use(
      http.get('/api/v1/category/get-category', () => {
        return HttpResponse.json({ success: false, message: 'Custom Backend Error' });
      })
    );
    
    renderCreateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Custom Backend Error');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows fallback error toast when category API fails with 500 error', async () => {
    server.use(
      http.get('/api/v1/category/get-category', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );
    
    renderCreateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows validation error toast when submitting form with empty fields', async () => {
    renderCreateProduct();
    
    // Attempt to submit without filling any fields
    const submitBtn = screen.getByText('CREATE PRODUCT');
    fireEvent.click(submitBtn);

    // Verify the validation logic triggers the correct error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please fill all the fields');
    });
  });

  // Lim Yik Seng, A0338506B
  it('prevents entering negative values in the price input', async () => {
    renderCreateProduct();
    
    const priceInput = screen.getByPlaceholderText('Write a price');

    // Attempt to input a negative value (-5)
    fireEvent.change(priceInput, { target: { value: '-5' } });
    
    // State should not update, so the value remains empty
    expect(priceInput.value).toBe('');

    // Attempt to input a valid positive value (50)
    fireEvent.change(priceInput, { target: { value: '50' } });
    
    // State should update successfully
    expect(priceInput.value).toBe('50');
  });

  // Lim Yik Seng, A0338506B
  it('prevents entering zero or negative values in the quantity input', async () => {
    renderCreateProduct();
    
    const quantityInput = screen.getByPlaceholderText('Write a quantity');

    // Attempt to input zero (0) - your code specifically uses parseFloat(value) > 0
    fireEvent.change(quantityInput, { target: { value: '0' } });
    expect(quantityInput.value).toBe('');

    // Attempt to input a negative value (-10)
    fireEvent.change(quantityInput, { target: { value: '-10' } });
    expect(quantityInput.value).toBe('');

    // Attempt to input a valid positive value (10)
    fireEvent.change(quantityInput, { target: { value: '10' } });
    expect(quantityInput.value).toBe('10');
  });

  // Lim Yik Seng, A0338506B
  it('rejects photo upload if the file size is 1MB or larger', async () => {
    renderCreateProduct();
    
    // Create a mock file that is exactly 1,000,000 bytes (1MB)
    const largeFile = new File(['a'.repeat(1000000)], 'huge-image.png', { type: 'image/png' });
    
    // Find the hidden file input element
    const fileInput = document.querySelector('input[type="file"]');
    
    // Trigger the file upload change event
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // Verify the size validation logic catches it
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Photo must be less than 1MB');
    });
  });

  // Lim Yik Seng, A0338506B
  it('accepts valid photo upload and renders the image preview', async () => {
    renderCreateProduct();
    
    // Create a small mock valid file
    const validFile = new File(['image-content'], 'product.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    
    // Trigger upload
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Wait for the UI to update and render the image preview
    await waitFor(() => {
      const imagePreview = screen.getByAltText('product_photo');
      expect(imagePreview).toBeInTheDocument();
      // Verify it uses the mocked URL.createObjectURL we set up in beforeAll
      expect(imagePreview).toHaveAttribute('src', 'mocked-image-url');
    });

    // Verify the upload button text changed to the file name
    expect(screen.getByText('product.png')).toBeInTheDocument();
  });

  // Lim Yik Seng, A0338506B
  it('successfully fills the form, submits to the API, and navigates to the admin products page', async () => {
    renderCreateProduct();
    
    // Wait for categories to load from MSW so the dropdown has options
    await waitFor(() => expect(screen.getByText('Select a category')).toBeInTheDocument());

    // Fill standard text and number inputs
    fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'New iPhone 16' } });
    fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'The latest Apple smartphone' } });
    fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '999' } });
    fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '50' } });

    // Upload a valid photo
    const validFile = new File(['dummy content'], 'iphone.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Interact with Ant Design Select for Category
    // Ant Design wraps the select in complex DOM structures. We find the main wrapper by ID and trigger mouseDown.
    const categorySelect = document.querySelector('#category-select .ant-select-selector') || document.querySelector('#category-select');
    fireEvent.mouseDown(categorySelect);
    
    // Wait for the dropdown portal to render the options (fetched from our initial MSW setup)
    const categoryOption = await screen.findByText('Electronics');
    fireEvent.click(categoryOption);

    // Interact with Ant Design Select for Shipping
    const shippingSelect = document.querySelector('#shipping-select .ant-select-selector') || document.querySelector('#shipping-select');
    fireEvent.mouseDown(shippingSelect);
    
    const shippingOption = await screen.findByText('Yes');
    fireEvent.click(shippingOption);

    // Submit the form
    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    // Verify the success toast and navigation
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product Created Successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when the create product API returns success: false', async () => {
    // Override MSW to simulate a validation error from the backend (e.g., product already exists)
    server.use(
      http.post('/api/v1/product/create-product', () => {
        return HttpResponse.json({ success: false, message: 'Product already exists' });
      })
    );
    
    renderCreateProduct();
    await waitFor(() => expect(screen.getByText('Select a category')).toBeInTheDocument());

    // Fill all required fields quickly
    fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Duplicate Product' } });
    fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });
    fireEvent.change(document.querySelector('input[type="file"]'), { 
      target: { files: [new File([''], 'img.png', { type: 'image/png' })] } 
    });

    fireEvent.mouseDown(document.querySelector('#category-select'));
    fireEvent.click(await screen.findByText('Electronics'));
    
    fireEvent.mouseDown(document.querySelector('#shipping-select'));
    fireEvent.click(await screen.findByText('Yes'));

    // Submit the form
    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    // Verify the error toast displays the backend's message
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Product already exists');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows fallback error toast when the create product API crashes (500)', async () => {
    // Override MSW to simulate a server crash
    server.use(
      http.post('/api/v1/product/create-product', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );
    
    renderCreateProduct();
    await waitFor(() => expect(screen.getByText('Select a category')).toBeInTheDocument());

    // Fill all required fields quickly
    fireEvent.change(screen.getByPlaceholderText('Write a name'), { target: { value: 'Crashed Product' } });
    fireEvent.change(screen.getByPlaceholderText('Write a description'), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByPlaceholderText('Write a price'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Write a quantity'), { target: { value: '10' } });
    fireEvent.change(document.querySelector('input[type="file"]'), { 
      target: { files: [new File([''], 'img.png', { type: 'image/png' })] } 
    });

    fireEvent.mouseDown(document.querySelector('#category-select'));
    fireEvent.click(await screen.findByText('Electronics'));
    
    fireEvent.mouseDown(document.querySelector('#shipping-select'));
    fireEvent.click(await screen.findByText('No'));

    // Submit the form
    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    // Verify the catch block's error toast is triggered
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

});