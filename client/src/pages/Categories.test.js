import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Categories from "./Categories";
import useCategory from "../hooks/useCategory";
import "@testing-library/jest-dom";

// Mock the custom hook to control its return values
jest.mock("../hooks/useCategory");

// Mock the Layout component to isolate testing to Categories logic
jest.mock("../components/Layout", () => ({ children, title }) => (
    <div data-testid="mock-layout">
        <h1>{title}</h1>
        {children}
    </div>
));

//LOU,YING-WEN A0338250J
describe("Categories Page Unit Test", () => {
    const mockCategories = [
        { _id: "1", name: "Electronics", slug: "electronics" },
        { _id: "2", name: "Books", slug: "books" },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Fix ReferenceError: React is not defined in Node environment
        global.React = React;
    });

    test("should render all category links correctly", () => {
        // Arrange: Set mock return value for the hook
        useCategory.mockReturnValue(mockCategories);

        // Act: Wrap with BrowserRouter as Categories uses Link component
        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        // Assert: Check if Layout title is rendered
        expect(screen.getByText("All Categories")).toBeInTheDocument();

        // Assert: Verify that both categories are displayed as links
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.getByText("Books")).toBeInTheDocument();

        // Assert: Verify correct URL path for the links
        expect(screen.getByText("Electronics").closest("a")).toHaveAttribute(
            "href",
            "/category/electronics"
        );
    });

    test("should render empty state when no categories are returned", () => {
        // Arrange: Simulate empty data array from hook
        useCategory.mockReturnValue([]);

        // Act
        render(
            <BrowserRouter>
                <Categories />
            </BrowserRouter>
        );

        // Assert: Ensure page doesn't crash and title still exists
        expect(screen.getByText("All Categories")).toBeInTheDocument();

        // Assert: Verify no links are rendered
        const links = screen.queryAllByRole("link");
        expect(links.length).toBe(0);
    });
});