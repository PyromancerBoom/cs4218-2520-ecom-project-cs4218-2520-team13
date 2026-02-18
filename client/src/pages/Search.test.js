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

    //LOU,YING-WEN A0338250J
    test("should display 'No Products Found' when search results are empty", () => {
        useSearch.mockReturnValue([{ results: [] }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(screen.getByText(/No Products Found/i)).toBeInTheDocument();
    });

    //LOU,YING-WEN A0338250J
    test("should render product card when results exist", () => {
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(screen.getByText("Test Laptop")).toBeInTheDocument();
        expect(screen.getByText(/Found 1/i)).toBeInTheDocument();
        expect(screen.getByText(/\$1,500.00/i)).toBeInTheDocument();
    });

    //LOU,YING-WEN A0338250J
    test("should add product to cart when 'ADD TO CART' is clicked", () => {
        const existingCart = [];
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([existingCart, mockSetCart]);
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        const addToCartBtn = screen.getByText(/ADD TO CART/i);
        fireEvent.click(addToCartBtn);

        expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
        expect(localStorage.setItem).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    //LOU,YING-WEN A0338250J
    test("should navigate to product details page when 'More Details' is clicked", () => {
        useSearch.mockReturnValue([{ results: mockProducts }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);
        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        const moreDetailsBtn = screen.getByText(/More Details/i);
        fireEvent.click(moreDetailsBtn);

        expect(mockNavigate).toHaveBeenCalledWith(`/product/${mockProducts[0].slug}`);
    });

    //LOU,YING-WEN A0338250J
    test("should handle multiple search results and long descriptions", () => {
        const multipleProducts = [
            {
                _id: "1",
                name: "Product 1",
                description: "This is a very long description that exceeds sixty characters to test the substring logic properly.",
                price: 100,
                slug: "product-1"
            },
            {
                _id: "2",
                name: "Product 2",
                description: "Short desc",
                price: 200,
                slug: "product-2"
            }
        ];
        useSearch.mockReturnValue([{ results: multipleProducts }, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        expect(screen.getByText(/Found 2/i)).toBeInTheDocument();
        expect(screen.getByText(/This is a very long description that exceeds sixty charac.../i)).toBeInTheDocument();
        expect(screen.getByText(/Short desc\.\.\./i)).toBeInTheDocument();
    });

    //LOU,YING-WEN A0338250J
    test("should append to existing cart items", () => {
        const existingItem = { _id: "0", name: "Existing", price: 10, description: "desc", slug: "existing" };
        const newItem = mockProducts[0];
        useSearch.mockReturnValue([{ results: [newItem] }, jest.fn()]);
        useCart.mockReturnValue([[existingItem], mockSetCart]);

        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );
        const addToCartBtn = screen.getByText(/ADD TO CART/i);
        fireEvent.click(addToCartBtn);

        expect(mockSetCart).toHaveBeenCalledWith([existingItem, newItem]);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            "cart",
            JSON.stringify([existingItem, newItem])
        );
    });

    //LOU,YING-WEN A0338250J
    test("should handle cases where results property is missing", () => {
        // values exists but results is missing/undefined
        useSearch.mockReturnValue([{}, jest.fn()]);
        useCart.mockReturnValue([[], mockSetCart]);

        render(
            <MemoryRouter>
                <Search />
            </MemoryRouter>
        );

        // Should default to "No Products Found" because undefined < 1 is false in this ternary
        expect(screen.getByText(/No Products Found/i)).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});