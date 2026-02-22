import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import ProductDetails from './ProductDetails';
import { describe } from 'node:test';
    /* 
        Screen is better than getByText, getByRole, etc. because getByText will run the render every time it is called, 
        while screen will only run the render once and then cache the result for future calls. This can improve performance 
        and reduce unnecessary re-renders in your tests.
    */ 

jest.mock('axios');
// For useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Retain other actual functionalities of react-router-dom
    useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock('../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
}));

jest.mock('../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
})); 

const mockProduct = {
  _id: "p123",
  name: "High-Performance Laptop",
  description: "This is a very long description intended to test the substring logic of the component.",
  price: 999.99,
  category: { 
    name: "Electronics",
    _id: "c123"
  },
  slug: "laptop-pro-2024"
};

const mockRelatedProducts = [
  {
    _id: "p456",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse.",
    price: 49.99,
    slug: "wireless-mouse"
  }
];

describe('ProductDetails Page Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not trigger getProduct API when slug is missing in params', async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { category: [] } });

        // Act
        // Dont have the slug
        render(
            <MemoryRouter initialEntries={["/product/"]}>  
                <Routes>
                    <Route path="/product/" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
            expect(axios.get).not.toHaveBeenCalledWith(expect.stringContaining("/api/v1/product/get-product/"));
        });
    });

    // Verifying the API request is made with the correct URL
    it('should trigger the getProduct API call with the exact slug from params', async () => {
        // Arrange
        // Mock Layout API first, then Product API, then Related Products API
        const incompleteMock = { ...mockProduct, category: { _id: null } };
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: incompleteMock } });

        // Act
        // Navigating to the route that matches mockProduct.slug
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />}/>
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Focus ONLY on the request layer to ensure the slug is passed correctly to the endpoint
            expect(axios.get).toHaveBeenCalledWith(
                `/api/v1/product/get-product/laptop-pro-2024`
            );
        });
    });

    // Verifying data from the API is correctly mapped to the layout
    it('should render main product name, description and price without triggering related products', async () => {
        // Arrange
        // Locally override category._id to null to prevent entering getSimilarProduct() logic
        const productOnlyMock = {
            ...mockProduct,
            category: { ...mockProduct.category, _id: null }
        };
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: productOnlyMock } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />}/>
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verify the specific visual elements match the mockProduct data
            expect(screen.getByText(`Name : ${mockProduct.name}`)).toBeInTheDocument();
            expect(screen.getByText(`Description : ${mockProduct.description}`)).toBeInTheDocument();
            
            // Check formatted price: $999.99 (matching your mockProduct.price)
            expect(screen.getByText(/\$999\.99/i)).toBeInTheDocument();
            
            // Check nested category name
            expect(screen.getByText(`Category : ${mockProduct.category.name}`)).toBeInTheDocument();

            // Verification: Ensure the related products API was NEVER called due to the null ID guard
            expect(axios.get).not.toHaveBeenCalledWith(
                expect.stringContaining("/api/v1/product/related-product/")
            );
        });
    });

    // Branch Logic: Should trigger getSimilarProduct when both IDs exist
    it('should call getSimilarProduct when both product _id and category _id are present', async () => {
        // Arrange: Use full mock data to satisfy the 'if' condition
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert: Check if the subsequent API call was made
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                `/api/v1/product/related-product/${mockProduct._id}/${mockProduct.category._id}`
            );
        });
    });

    // Branch Logic: Should NOT call getSimilarProduct when product _id is missing
    it('should not call getSimilarProduct when product _id is missing', async () => {
        // Arrange: Local override to remove _id
        const noIdProduct = { ...mockProduct, _id: null };
        
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: noIdProduct } });

        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert: Product details render, but related API is never called
        await waitFor(() => {
            expect(screen.getByText("Name : " + mockProduct.name)).toBeInTheDocument();
        });
        
        expect(axios.get).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/related-product/")
        );
    });

    // Branch Logic: Should NOT call getSimilarProduct when category _id is missing
    it('should not call getSimilarProduct when category _id is missing', async () => {
        // Arrange: Local override 
        const noCatIdProduct = { 
            ...mockProduct, 
            category: { ...mockProduct.category, _id: null } 
        };
        
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: noCatIdProduct } });

        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Name : " + mockProduct.name)).toBeInTheDocument();
        });
        
        expect(axios.get).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/related-product/")
        );
    });

    // Branch Logic: Should NOT call getSimilarProduct when both IDs are missing
    it('should not call getSimilarProduct when both product _id and category _id are missing', async () => {
        // Arrange: Kill both IDs
        const totallyBrokenProduct = { 
            ...mockProduct, 
            _id: null,
            category: { ...mockProduct.category, _id: null } 
        };
        
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: totallyBrokenProduct } });

        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Name : " + mockProduct.name)).toBeInTheDocument();
        });
        
        expect(axios.get).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/v1/product/related-product/")
        );
    });

    it('should handle API errors (getProduct function)', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs in test output
        const mockError = new Error('API error');
        
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/get-product/')) {
                return Promise.reject(mockError);
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console.log implementation
    });

    // Logic Test: Verifying the related products API request parameters
    it('should trigger getSimilarProduct API with correct pid and cid when main product is loaded', async () => {
        // Arrange
        // Sequence: 1. Layout Categories -> 2. Main Product -> 3. Related Products
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: [] } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Check if the API was called with the IDs from mockProduct
            expect(axios.get).toHaveBeenCalledWith(
                `/api/v1/product/related-product/${mockProduct._id}/${mockProduct.category._id}`
            );
        });
    });

    // UI Test: Verifying "No Similar Products found" display when list is empty
    it('should display "No Similar Products found" when the products array is empty', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: [] } }); // Returning empty list

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Name : " + mockProduct.name)).toBeInTheDocument();
        });
        await waitFor(() => {
            // Verify the specific empty state message
            expect(screen.getByText(/No Similar Products found/i)).toBeInTheDocument();
        });
    });

    // UI Test: Verifying rendering of a single similar product card
    it('should render exactly one similar product card when API returns one item', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: mockRelatedProducts } }); // Contains 1 item

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // Verify the related product name is in the document
            expect(screen.getByText(mockRelatedProducts[0].name)).toBeInTheDocument();
            // Verify price formatting for the related product
            expect(screen.getByText(/\$49\.99/i)).toBeInTheDocument();
        });

        // Ensure "No Similar Products found" is NOT visible
        expect(screen.queryByText(/No Similar Products found/i)).not.toBeInTheDocument();
    });

    // UI Test: Verifying rendering of multiple similar product cards
    it('should render multiple similar product cards when API returns a list', async () => {
        // Arrange
        const multiRelated = [
            { _id: "r1", name: "Related 1", description: "Desc 1", price: 10, slug: "r1" },
            { _id: "r2", name: "Related 2", description: "Desc 2", price: 20, slug: "r2" }
        ];
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: multiRelated } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Related 1")).toBeInTheDocument();
            expect(screen.getByText("Related 2")).toBeInTheDocument();
            expect(screen.getByText(/\$10\.00/i)).toBeInTheDocument();
            expect(screen.getByText(/\$20\.00/i)).toBeInTheDocument();
        });

        // Verify that multiple "More Details" buttons are rendered (one for each product)
        const buttons = screen.getAllByRole('button', { name: /more details/i });
        expect(buttons).toHaveLength(2);
    });

    it('should display the full description with dots when it is under 60 characters', async () => {
        // Arrange: 只有 10 個字
        const shortDesc = "Short one";

        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: [{ ...mockRelatedProducts[0], description: shortDesc }] } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // 根據你的 JSX，少於 60 字也會接上 ...
            expect(screen.getByText(`${shortDesc}...`)).toBeInTheDocument();
        });
    });

    it('should truncate related product description if it exceeds 60 characters', async () => {
        // Arrange: 剛好 70 個字元的描述
        const longDesc = "ThisIsALongDescriptionThatExceedsSixtyCharactersToTestTheSubstringLogic!!";
        const expectedTruncated = longDesc.substring(0, 60); // 截取前 60 碼

        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: [{ ...mockRelatedProducts[0], description: longDesc }] } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            // 檢查前 60 碼是否存在 (加上後面的 ...)
            expect(screen.getByText(new RegExp(`${expectedTruncated}...`, 'i'))).toBeInTheDocument();
            
            // 檢查完整描述是否「不」存在 (證明真的有截斷)
            expect(screen.queryByText(longDesc)).not.toBeInTheDocument();
        });
    });

    it('should handle API errors (getSimilarProduct function)', async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to suppress error logs in test output
        const mockError = new Error('API error');
        
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/v1/product/related-product/')) {
                return Promise.reject(mockError);
            }
            else if (url.includes('/api/v1/product/get-product/')) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { category: [] } }); // For Header
        });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore(); // Restore original console.log implementation
    });

    it('should navigate to the product details page when a valid slug exists', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        const moreDetailsBtn = await screen.findByRole('button', { name: /more details/i });
        fireEvent.click(moreDetailsBtn);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${mockRelatedProducts[0].slug}`);
    });

    it('should not trigger navigation if the product slug is missing', async () => {
        // Arrange: Create a related product without a slug to test the guard condition in the onClick handler
        const noSlugRelated = [{ ...mockRelatedProducts[0], slug: null }];

        axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
        axios.get.mockResolvedValueOnce({ data: { product: mockProduct } });
        axios.get.mockResolvedValueOnce({ data: { products: noSlugRelated } });

        // Act
        render(
            <MemoryRouter initialEntries={['/product/laptop-pro-2024']}>
                <Routes><Route path="/product/:slug" element={<ProductDetails />}/></Routes>
            </MemoryRouter>
        );

        const moreDetailsBtn = await screen.findByRole('button', { name: /more details/i });
        fireEvent.click(moreDetailsBtn);

        // Assert
        expect(mockNavigate).not.toHaveBeenCalled();
    });

});

