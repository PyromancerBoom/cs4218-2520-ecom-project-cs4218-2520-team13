import React from "react";
global.React = React;
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";
import "@testing-library/jest-dom";

jest.mock("react-hot-toast", () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

const TestComponent = () => {
    const [auth, setAuth] = useSearch();
    return (
        <div>
            <div data-testid="keyword">{auth.keyword}</div>
            <div data-testid="results-count">{auth.results.length}</div>
            <button
                onClick={() => setAuth({ ...auth, keyword: "laptop", results: [1, 2] })}
            >
                Search
            </button>
        </div>
    );
};

//LOU,YING-WEN A0338250J
describe("Search Context Unit Test", () => {
    test("should provide default values", () => {
        // Arrange
        // No additional setup needed 

        // Act
        render(
            <SearchProvider>
                <TestComponent />
            </SearchProvider>
        );

        // Assert
        expect(screen.getByTestId("keyword")).toHaveTextContent("");
        expect(screen.getByTestId("results-count")).toHaveTextContent("0");
    });

    test("should update state when setValues is called", () => {
        // Arrange
        render(
            <SearchProvider>
                <TestComponent />
            </SearchProvider>
        );
        const button = screen.getByText("Search");

        // Act
        fireEvent.click(button);

        // Assert
        expect(screen.getByTestId("keyword")).toHaveTextContent("laptop");
        expect(screen.getByTestId("results-count")).toHaveTextContent("2");
    });
});