// Lim Yik Seng, A0338506B
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import toast from 'react-hot-toast';
import UpdateProduct from '../../pages/admin/UpdateProduct';
import axios from 'axios';

// Mock Context & Components
jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: { name: 'Admin', role: 1 }, token: 'admin-token' }, jest.fn()])
}));
jest.mock('../../components/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/AdminMenu', () => () => <div>AdminMenu</div>);
jest.mock('react-hot-toast');

// Mock Router: We need useParams to return a fake slug so getSingleProduct works
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'test-iphone' }) // Mock URL param
}));

// Mock window.confirm (for delete testing later) and URL.createObjectURL
beforeAll(() => {
  global.window.confirm = jest.fn();
  global.URL.createObjectURL = jest.fn(() => 'mocked-new-image-url');
});

// Setup MSW Server (Happy Path for Initial Mount)
const server = setupServer(
  // Intercept getSingleProduct
  http.get('/api/v1/product/get-product/:slug', () => {
    return HttpResponse.json({
      success: true,
      product: {
        _id: 'prod-777',
        name: 'Old iPhone 15',
        description: 'Used phone',
        price: 500,
        quantity: 5,
        shipping: '1',
        category: { _id: 'cat-1', name: 'Electronics' }
      }
    });
  }),
  // Intercept getAllCategory
  http.get('/api/v1/category/get-category', () => {
    return HttpResponse.json({
      success: true,
      category: [
        { _id: 'cat-1', name: 'Electronics' },
        { _id: 'cat-2', name: 'Books' }
      ]
    });
  }),

  http.put('/api/v1/product/update-product/:id', () => {
    return HttpResponse.json({ success: true, message: 'Product Updated Successfully' });
  }),
  http.delete('/api/v1/product/delete-product/:id', () => {
    return HttpResponse.json({ success: true, message: 'Product Deleted Successfully' });
  })
);

// Test Lifecycle Hooks
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  axios.defaults.headers.common['Authorization'] = 'admin-token';
  jest.clearAllMocks();
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  jest.restoreAllMocks();
});

const renderUpdateProduct = () => render(
  <MemoryRouter>
    <UpdateProduct />
  </MemoryRouter>
);

describe('UpdateProduct Component - Frontend Integration', () => {

  // Lim Yik Seng, A0338506B
  it('successfully fetches and pre-populates the product and category data on mount', async () => {
    renderUpdateProduct();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Used phone')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    const existingImage = screen.getByAltText('product_photo');
    expect(existingImage).toHaveAttribute('src', '/api/v1/product/product-photo/prod-777');
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when fetching the single product fails (500 Error)', async () => {
    server.use(
      http.get('/api/v1/product/get-product/:slug', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );
    
    renderUpdateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when fetching categories returns success: false', async () => {
    server.use(
      http.get('/api/v1/category/get-category', () => {
        return HttpResponse.json({ success: false, message: 'Failed to fetch categories from DB' });
      })
    );
    
    renderUpdateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch categories from DB');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when fetching categories fails (500 Error)', async () => {
    server.use(
      http.get('/api/v1/category/get-category', () => HttpResponse.json({}, { status: 500 }))
    );
    
    renderUpdateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category');
    });
  });

  // Lim Yik Seng, A0338506B
  it('switches from the existing backend photo to the new local preview when a valid photo is uploaded', async () => {
    renderUpdateProduct();
    
    await waitFor(() => {
      const existingImage = screen.getByAltText('product_photo');
      expect(existingImage).toHaveAttribute('src', '/api/v1/product/product-photo/prod-777');
    });

    const validFile = new File(['new-image-data'], 'new-product.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      const updatedImage = screen.getByAltText('product_photo');
      expect(updatedImage).toHaveAttribute('src', 'mocked-new-image-url');
      expect(screen.getByText('new-product.png')).toBeInTheDocument();
    });
  });

  // Lim Yik Seng, A0338506B
  it('rejects the new photo upload if the file size is 1MB or larger', async () => {
    renderUpdateProduct();
    
    const largeFile = new File(['a'.repeat(1000000)], 'huge-image.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Photo must be less than 1MB');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows validation error toast if required fields are cleared before updating', async () => {
    renderUpdateProduct();
    
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const nameInput = screen.getByDisplayValue('Old iPhone 15');
    fireEvent.change(nameInput, { target: { value: '' } });

    const updateBtn = screen.getByText('UPDATE PRODUCT');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Please fill all required fields');
    });
  });

  // Lim Yik Seng, A0338506B
  it('prevents entering negative values in the price input during update', async () => {
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('500')).toBeInTheDocument());
    
    const priceInput = screen.getByDisplayValue('500');

    fireEvent.change(priceInput, { target: { value: '-50' } });
    expect(priceInput.value).toBe('');

    fireEvent.change(priceInput, { target: { value: '450' } });
    expect(priceInput.value).toBe('450');
  });

  // Lim Yik Seng, A0338506B
  it('prevents entering zero or negative values in the quantity input during update', async () => {
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('5')).toBeInTheDocument());
    
    const quantityInput = screen.getByDisplayValue('5');

    fireEvent.change(quantityInput, { target: { value: '0' } });
    expect(quantityInput.value).toBe('');

    fireEvent.change(quantityInput, { target: { value: '-10' } });
    expect(quantityInput.value).toBe('');

    fireEvent.change(quantityInput, { target: { value: '15' } });
    expect(quantityInput.value).toBe('15');
  });

  // Lim Yik Seng, A0338506B
  it('successfully updates the product and navigates back to products list', async () => {
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Old iPhone 15'), { target: { value: 'Updated iPhone 15 Pro' } });
    fireEvent.change(screen.getByDisplayValue('500'), { target: { value: '899' } });
    fireEvent.change(screen.getByDisplayValue('Used phone'), { target: { value: 'This is a newly updated description' } });
    fireEvent.mouseDown(document.querySelector('#category-select'));
    fireEvent.click(await screen.findByText('Books'));

    fireEvent.mouseDown(document.querySelector('#shipping-select'));
    fireEvent.click(await screen.findByText('No'));

    const validFile = new File(['new-image'], 'new-product.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [validFile] } });
    
    fireEvent.click(screen.getByText('UPDATE PRODUCT'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows error toast when the update API returns success: false', async () => {
    server.use(
      http.put('/api/v1/product/update-product/:id', () => {
        return HttpResponse.json({ success: false, message: 'Product name already exists' });
      })
    );
    
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const updateBtn = screen.getByText('UPDATE PRODUCT');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Product name already exists');
    });
  });

  // Lim Yik Seng, A0338506B
  it('cancels the deletion process when the user clicks Cancel on the confirm dialog', async () => {
    window.confirm.mockReturnValueOnce(false);
    
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const deleteBtn = screen.getByText('DELETE PRODUCT');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // Lim Yik Seng, A0338506B
  it('successfully deletes the product when the user clicks OK on the confirm dialog', async () => {
    window.confirm.mockReturnValueOnce(true);

    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const deleteBtn = screen.getByText('DELETE PRODUCT');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
      expect(toast.success).toHaveBeenCalledWith('Product Deleted Successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/products');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows fallback error toast when the update API crashes (500 Error in catch block)', async () => {
    server.use(
      http.put('/api/v1/product/update-product/:id', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );
    
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const updateBtn = screen.getByText('UPDATE PRODUCT');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });

  // Lim Yik Seng, A0338506B
  it('shows fallback error toast when the delete API crashes (500 Error in catch block)', async () => {
    window.confirm.mockReturnValueOnce(true); 

    server.use(
      http.delete('/api/v1/product/delete-product/:id', () => {
        return HttpResponse.json({}, { status: 500 });
      })
    );
    
    renderUpdateProduct();
    await waitFor(() => expect(screen.getByDisplayValue('Old iPhone 15')).toBeInTheDocument());

    const deleteBtn = screen.getByText('DELETE PRODUCT');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });
});