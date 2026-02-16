import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Search from "./Search";
import { useSearch } from "../context/search";
import { useCart } from "../context/cart";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";

// Mocking dependencies to isolate Search component
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

jest.mock("react-hot-toast", () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

jest.mock("../context/search");
jest.mock("../context/cart");
jest.mock("./../components/Layout", () => ({ children }) => <div>{children}</div>);

//LOU,YING-WEN A0338250J
describe("Search Component Unit Test", () => {
    const mockSetCart = jest.fn();
    const mockProducts = [
        {
            _id: "1",
            name: "Test Laptop",
            description: "A high performance gaming laptop",
            price: 1500,
            slug: "test-laptop"
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(() => JSON.stringify([])),
                setItem: jest.fn(),
            },
            writable: true,
        });
    });

    test("should display 'No Products Found' when search results are empty", () => {
        // Arrange
        useSearch.mockReturnValue([{ results: [] }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        // Act
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        // Assert
        expect(screen.getByText(/No Products Found/i)).toBeInTheDocument();
    });

    test("should render product card when results exist", () => {
        // Arrange
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        // Act
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        // Assert
        expect(screen.getByText("Test Laptop")).toBeInTheDocument();
        expect(screen.getByText(/Found 1/i)).toBeInTheDocument();
        expect(screen.getByText(/\$1,500.00/i)).toBeInTheDocument();
    });

    test("should add product to cart when 'ADD TO CART' is clicked", () => {
        // Arrange
        const existingCart = [];
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([existingCart, mockSetCart]);
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        // Act
        const addToCartBtn = screen.getByText(/ADD TO CART/i);
        fireEvent.click(addToCartBtn);

        // Assert
        expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
        expect(localStorage.setItem).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
    test("should navigate to product details page when 'More Details' is clicked", () => {
        // Araange
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        // Act 
        const moreDetailsBtn = screen.getByText(/More Details/i);
        fireEvent.click(moreDetailsBtn);

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${mockProducts[0].slug}`);
    });
});