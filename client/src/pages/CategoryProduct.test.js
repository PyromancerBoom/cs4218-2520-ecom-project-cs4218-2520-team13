import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import CategoryProduct from './CategoryProduct';
import { describe } from 'node:test';

jest.mock('axios');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Retain other actual functionalities of react-router-dom
    useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));
    
jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
})); 

// Lim Yik Seng, A0338506B
describe('CategoryProduct Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Lim Yik Seng, A0338506B
    it('should not trigger API call when slug is missing in params', async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { category: [] } });

        // Act
        // Dont have the slug
        render(
            <MemoryRouter initialEntries={["/category/"]}>  
                <Routes>
                    <Route path="/category/" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        // We expect the category list in Header to be fetched
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        // We expect the product-category API NOT to be called, because params.slug is missing. 
        expect(axios.get).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/product-category/")
        );
    });

    // Lim Yik Seng, A0338506B
    it('should render the component and trigger product fetch when slug is present', async () => {
        // Arrange 
        // For Header (the order of mockResolvedValueOnce is important)
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({
            data: {
                products: [ {_id: 'p1', name: 'Phone', price: 500, description: 'Smartphone'} ],
                category: { name: 'Electronics' }
            }
        });

        // Act
        render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-category/electronics");
        });
    });

    // Lim Yik Seng, A0338506B
    it('should correctly format currency and truncate long descriptions', async () => {
        // Arrange
        const longDescription = "This is a very long description intended to test the substring logic of the component.";
        const mockData = {
            // Cuz it uses map in jsx, it needs to be an array
            products: [{ _id: "p1", name: "Laptop", price: 1000, description: longDescription }],
            category: { name: 'Electronics' }
        }
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: mockData });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(getByText('Category - Electronics')).toBeInTheDocument();
            expect(getByText('Laptop')).toBeInTheDocument();
            expect(getByText('$1,000.00')).toBeInTheDocument();

            const descriptionElement = getByText(/This is a very long description/i);
            // Test JS logic: description.substring(0, 60)
            const expectedTruncatedText = longDescription.substring(0, 60);
            // Separately testing the content and the ellipsis as requested
            expect(descriptionElement).toHaveTextContent(expectedTruncatedText);
            expect(descriptionElement).toHaveTextContent('...');
        });
    });

    // Lim Yik Seng, A0338506B
    // Multiple Items Rendering
    it('should render a list of multiple products correctly', async () => {
        // Arrange
        // Mocking multiple products returned from API
        const mockProducts = [
            { _id: '1', name: 'Product A', price: 10, description: 'Desc A', slug: 'a' },
            { _id: '2', name: 'Product B', price: 20, description: 'Desc B', slug: 'b' }
        ];
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); // Layout Header
        axios.get.mockResolvedValueOnce({ data: { products: mockProducts, category: { name: 'Test' } } });

        // Act
        const { getByText, getAllByText } = render(
            <MemoryRouter initialEntries={["/category/test"]}>
                <Routes><Route path="/category/:slug" element={<CategoryProduct />} /></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verify that 2 product cards are rendered by checking the number of "More Details" buttons
            const buttons = getAllByText('More Details');
            expect(buttons).toHaveLength(2); 
            // Verify individual product names are present in the document
            expect(getByText('Product A')).toBeInTheDocument();
            expect(getByText('Product B')).toBeInTheDocument();
        });
    });

    // Lim Yik Seng, A0338506B
    it('should log an error to console when the API request fails', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Empty console log to avoid cluttering test output
        const mockError = new Error('API call failed');

        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-category/')) {
                return Promise.reject(mockError);
            }
            return Promise.resolve({ data: { category: [] } });
        });

        // Act
        render(
            <MemoryRouter initialEntries={["/category/electronics"]}>   
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console log implementation
    });

    // Lim Yik Seng, A0338506B
    it('should handle null category data gracefully in the heading', async () => {
        // Arrange
        // Simulate API returning null for category
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: { products: [], category: null } });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verifies Category - {category?.name} logic works without crashing
            expect(getByText('Category')).toBeInTheDocument();
        });
    });

    // Lim Yik Seng, A0338506B
    it('should display 0 results when products array is null', async () => {
        // Arrange
        // Simulate API returning null for products
        axios.get.mockResolvedValueOnce({ data: { category: { name: 'Electronics' } } });
        axios.get.mockResolvedValueOnce({ data: { products: null, category: { name: 'Electronics' } } });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verifies {products?.length || 0} logic works without crashing
            expect(getByText('0 result found')).toBeInTheDocument();
        });
    });

    // Lim Yik Seng, A0338506B
    it('should not crash when a product description is null', async () => {
        // Arrange
        // Simulate a product that exists but has no description
        const mockData = {
            products: [{ _id: "p1", name: "No-Desc Product", price: 100, description: null }],
            category: { name: 'Test' }
        };
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: mockData });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/test"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verifies p.description?.substring(0, 60) logic works without crashing
            expect(getByText('No-Desc Product')).toBeInTheDocument();
        });
    });

    // Lim Yik Seng, A0338506B
    it('should not crash when a product price is null', async () => {
        // Arrange
        // Simulate a product that exists but has no price
        const mockData = {
            products: [{ _id: "p1", name: "Free Product", price: null, description: "Some desc" }],
            category: { name: 'Test' }
        };
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: mockData });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/test"]}>
                <Routes><Route path="/category/:slug" element={<CategoryProduct />} /></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verifies p.price?.toLocaleString(...) logic works without crashing
            expect(getByText('Free Product')).toBeInTheDocument();
        });
    });

    // Lim Yik Seng, A0338506B
    it('should navigate to product detail page when clicking More Details button', async () => {
        // Arrange
        const mockData = {
            products: [{ _id: "p1", name: "Laptop", price: 1000, description: "Excellent laptop", slug: "laptop" }],
            category: { name: 'Electronics' }
        }
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/product-category/')) {
                return Promise.resolve({ data: mockData });
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        const { getByText } = render(
            <MemoryRouter initialEntries={["/category/electronics"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        const button = await waitFor(() => getByText('More Details'));
        fireEvent.click(button);

        expect(mockNavigate).toHaveBeenCalledWith('/product/laptop');
    });

    // Lim Yik Seng, A0338506B
    it('Should render correct product image sources and alt tags', async () => {
        // Arrange
        const product = { _id: "img123", name: "Visual Item", price: 10, description: "Desc", slug: "item" };
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        axios.get.mockResolvedValueOnce({ data: { products: [product], category: { name: 'Test' } } });

        // Act
        const { findByAltText } = render(
            <MemoryRouter initialEntries={["/category/test"]}>
                <Routes>
                    <Route path="/category/:slug" element={<CategoryProduct />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        const image = await findByAltText('Visual Item');
        expect(image).toHaveAttribute('src', '/api/v1/product/product-photo/img123');
        expect(image).toHaveClass('card-img-top');
    });
});
