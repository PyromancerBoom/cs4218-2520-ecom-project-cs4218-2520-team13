// A0338250J LOU, YING-WEN
import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Categories from "../../pages/Categories";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import "@testing-library/jest-dom";

jest.mock("axios");

describe("Categories Page & Layout Full Integration Test", () => {
    const mockCategoriesData = {
        data: {
            success: true,
            category: [
                { _id: "601", name: "Electronics", slug: "electronics" },
                { _id: "602", name: "Books", slug: "books" },
            ],
        },
    };

    const emptyCategoriesData = {
        data: {
            success: true,
            category: [],
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockImplementation((url) => {
            if (url.includes("/api/v1/category/get-category")) {
                return Promise.resolve(mockCategoriesData);
            }
            return Promise.resolve({ data: {} });
        });
    });

    afterEach(() => {
        cleanup();
    });

    const renderWithProviders = (ui, { initialEntries = ["/"] } = {}) => {
        return render(
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        );
    };

    test("Integration: Should render Layout elements and sync categories from real hook", async () => {
        renderWithProviders(<Categories />, { initialEntries: ["/categories"] });

        expect(screen.getByRole("navigation")).toBeInTheDocument();
        expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

        const electronicsLinks = await screen.findAllByRole("link", { name: "Electronics" });
        const electronicsInBody = electronicsLinks.find((link) => link.classList.contains("btn-primary"));

        expect(electronicsInBody).toBeInTheDocument();
        expect(electronicsInBody).toHaveAttribute("href", "/category/electronics");
        expect(electronicsLinks.length).toBeGreaterThan(1);
        expect(electronicsLinks.some((link) => link.classList.contains("dropdown-item"))).toBe(true);
    });

    test("User Flow: Should navigate to specific category detail page on click", async () => {
        renderWithProviders(
            <Routes>
                <Route path="/categories" element={<Categories />} />
                <Route path="/category/:slug" element={<div>Category Detail Page</div>} />
            </Routes>,
            { initialEntries: ["/categories"] }
        );

        const electronicsLinks = await screen.findAllByRole("link", { name: "Electronics" });
        const mainBtn = electronicsLinks.find((link) => link.classList.contains("btn-primary"));

        fireEvent.click(mainBtn);

        expect(await screen.findByText("Category Detail Page")).toBeInTheDocument();
    });

    test("Edge Case: Should display Layout structure even when API fails", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValue(new Error("API Error"));

        renderWithProviders(<Categories />, { initialEntries: ["/categories"] });

        expect(screen.getByRole("navigation")).toBeInTheDocument();

        await waitFor(() => {
            const categoryLinks = screen.queryAllByRole("link").filter((l) => l.classList.contains("btn-primary"));
            expect(categoryLinks.length).toBe(0);
        });

        consoleSpy.mockRestore();
    });

    test("Edge Case: Should handle empty category list from API gracefully", async () => {
        axios.get.mockResolvedValue(emptyCategoriesData);

        renderWithProviders(<Categories />, { initialEntries: ["/categories"] });

        expect(screen.getByRole("navigation")).toBeInTheDocument();

        await waitFor(() => {
            const buttons = screen.queryAllByRole("link").filter((link) => link.classList.contains("btn-primary"));
            expect(buttons.length).toBe(0);
        });
    });
});