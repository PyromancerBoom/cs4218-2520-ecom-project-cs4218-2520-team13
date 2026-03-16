// A0338250J LOU, YING-WEN
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { SearchProvider } from "../../context/search";
import { CartProvider } from "../../context/cart";
import SearchInput from "../../components/Form/SearchInput";
import Search from "../../pages/Search";
import "@testing-library/jest-dom";

// Mock axios to control API responses
jest.mock("axios");

// Mocking Layout internal components to avoid side effects during integration
jest.mock("../../components/Header", () => () => <div data-testid="mock-header">Header</div>);
jest.mock("../../components/Footer", () => () => <div data-testid="mock-footer">Footer</div>);

const AllProviders = ({ children }) => (
    <MemoryRouter initialEntries={["/"]}>
        <CartProvider>
            <SearchProvider>
                {children}
            </SearchProvider>
        </CartProvider>
    </MemoryRouter>
);

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

describe("Search Functionality Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    const mockProductData = {
        results: [
            {
                _id: "123456",
                name: "Gaming Laptop",
                description: "High-performance gaming laptop with RTX 4080 and 32GB RAM.",
                price: 1999.99,
                slug: "gaming-laptop",
            },
        ],
    };

    test("should update context, navigate, and render results when search is performed", async () => {
        axios.get.mockResolvedValue({ data: mockProductData });

        render(
            <AllProviders>
                <Routes>
                    <Route path="/" element={<SearchInput />} />
                    <Route path="/search" element={<Search />} />
                </Routes>
            </AllProviders>
        );

        const input = screen.getByPlaceholderText("Search");
        fireEvent.change(input, { target: { value: "laptop" } });

        const searchButton = screen.getByRole("button", { name: /search/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
        });
        const resultsHeader = await screen.findByText("Search Results");

        expect(resultsHeader).toBeInTheDocument();
        expect(screen.getByText("Found 1")).toBeInTheDocument();
        expect(screen.getByText("Gaming Laptop")).toBeInTheDocument();
        expect(screen.getByText("$1,999.99")).toBeInTheDocument();
    });

    test("should render 'No Products Found' empty state when API returns no results", async () => {
        axios.get.mockResolvedValue({ data: { results: [] } });

        render(
            <AllProviders>
                <Routes>
                    <Route path="/" element={<SearchInput />} />
                    <Route path="/search" element={<Search />} />
                </Routes>
            </AllProviders>
        );

        fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "nonexistent" } });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(screen.getByText("No Products Found")).toBeInTheDocument();
        });
    });

    test("should maintain data integrity across navigation", async () => {
        axios.get.mockResolvedValue({ data: mockProductData });

        render(
            <AllProviders>
                <Routes>
                    <Route path="/" element={<SearchInput />} />
                    <Route path="/search" element={<Search />} />
                </Routes>
            </AllProviders>
        );

        fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "laptop" } });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        const productTitle = await screen.findByText("Gaming Laptop");
        expect(productTitle).toBeInTheDocument();
        expect(screen.getByText(/High-performance gaming/i)).toBeInTheDocument();
    });

    test("should store product in localStorage when ADD TO CART is clicked", async () => {
        axios.get.mockResolvedValue({ data: mockProductData });

        render(
            <AllProviders>
                <Routes>
                    <Route path="/" element={<SearchInput />} />
                    <Route path="/search" element={<Search />} />
                </Routes>
            </AllProviders>
        );

        const input = screen.getByPlaceholderText("Search");
        fireEvent.change(input, { target: { value: "laptop" } });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        const addBtn = await screen.findByText("ADD TO CART");
        fireEvent.click(addBtn);

        const cart = JSON.parse(localStorage.getItem("cart"));
        expect(cart).toHaveLength(1);
        expect(cart[0].name).toBe("Gaming Laptop");
        expect(cart[0].price).toBe(1999.99);
    });

    test("should handle API failure gracefully", async () => {
        axios.get.mockRejectedValue(new Error("500 Internal Server Error"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        render(
            <AllProviders>
                <SearchInput />
            </AllProviders>
        );

        fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "error" } });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        expect(screen.queryByText("Search Results")).not.toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    test("should trim whitespace from keyword before making API call", async () => {
        axios.get.mockResolvedValue({ data: { results: [] } });

        render(
            <AllProviders>
                <SearchInput />
            </AllProviders>
        );

        fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "  laptop  " } });
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
        });
    });
});