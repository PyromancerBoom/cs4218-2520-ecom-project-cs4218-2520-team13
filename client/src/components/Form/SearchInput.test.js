import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import SearchInput from "./SearchInput";
import { useSearch } from "../../context/search";


jest.mock("axios");
jest.mock("../../context/search");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

//LOU,YING-WEN A0338250J
describe("SearchInput Component Unit Test", () => {
    const mockSetValues = jest.fn();
    const mockValues = { keyword: "", results: [] };

    beforeEach(() => {
        jest.clearAllMocks();
        useSearch.mockReturnValue([mockValues, mockSetValues]);
    });

    test("should update keyword value on input change", () => {
        // Arrange
        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        // Act
        const input = screen.getByPlaceholderText("Search");
        fireEvent.change(input, { target: { value: "laptop" } });

        // Assert
        expect(mockSetValues).toHaveBeenCalledWith({
            ...mockValues,
            keyword: "laptop",
        });
    });

    test("should call API and navigate on successful submit", async () => {
        // Arrange
        const mockResults = [{ _id: "1", name: "Laptop" }];
        axios.get.mockResolvedValue({ data: mockResults });
        useSearch.mockReturnValue([{ keyword: "laptop", results: [] }, mockSetValues]);
        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        // Act
        const form = screen.getByRole("search");
        fireEvent.submit(form);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
            expect(mockSetValues).toHaveBeenCalledWith({
                keyword: "laptop",
                results: mockResults,
            });
            expect(mockNavigate).toHaveBeenCalledWith("/search");
        });
    });

    test("should handle API error gracefully", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValue(new Error("API Error"));

        useSearch.mockReturnValue([{ keyword: "error", results: [] }, mockSetValues]);

        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        // Act
        const form = screen.getByRole("search");
        fireEvent.submit(form);

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });

        consoleSpy.mockRestore();
    });
});