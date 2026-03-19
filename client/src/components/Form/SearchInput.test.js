const React = require("react");
global.React = React;

jest.mock("react-hot-toast", () => ({
    error: jest.fn(),
    success: jest.fn(),
}));

jest.mock("axios");
jest.mock("../../context/search");

const { render, screen, fireEvent, waitFor } = require("@testing-library/react");
const axios = require("axios");
const { MemoryRouter } = require("react-router-dom");
const SearchInput = require("./SearchInput").default;
const { useSearch } = require("../../context/search");
const toast = require("react-hot-toast");

require("@testing-library/jest-dom");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

describe("SearchInput Component Unit Test", () => {
    const mockSetValues = jest.fn();
    const mockValues = { keyword: "", results: [] };
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        useSearch.mockReturnValue([mockValues, mockSetValues]);
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it("should update keyword value on input change", () => {
        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText("Search");
        fireEvent.change(input, { target: { value: "laptop" } });

        expect(mockSetValues).toHaveBeenCalledWith({
            ...mockValues,
            keyword: "laptop",
        });
    });

    it("should call API and navigate on successful submit", async () => {
        const mockResults = [{ _id: "1", name: "Laptop" }];
        axios.get.mockResolvedValue({
            data: { results: mockResults }
        });

        useSearch.mockReturnValue([{ keyword: "laptop", results: [] }, mockSetValues]);

        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const form = screen.getByRole("search");
        fireEvent.submit(form);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
            expect(mockSetValues).toHaveBeenCalledWith({
                keyword: "laptop",
                results: mockResults,
            });
            expect(mockNavigate).toHaveBeenCalledWith("/search");
        });
    });

    it("should handle API error gracefully", async () => {
        axios.get.mockRejectedValue(new Error("API Error"));
        useSearch.mockReturnValue([{ keyword: "error", results: [] }, mockSetValues]);

        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const form = screen.getByRole("search");
        fireEvent.submit(form);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    it("should have correct accessibility attributes and input type", () => {
        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const input = screen.getByPlaceholderText("Search");
        expect(input).toHaveAttribute("type", "search");
        expect(input).toHaveAttribute("aria-label", "Search");

        const button = screen.getByRole("button", { name: /search/i });
        expect(button).toHaveAttribute("type", "submit");
    });

    it("should prevent default form submission behavior", () => {
        const { createEvent } = require("@testing-library/react");

        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const form = screen.getByRole("search");
        const submitEvent = createEvent.submit(form);
        Object.defineProperty(submitEvent, 'preventDefault', { value: jest.fn() });
        fireEvent(form, submitEvent);

        expect(submitEvent.preventDefault).toHaveBeenCalled();
    });

    test("should handle submission with an empty keyword correctly", async () => {
        useSearch.mockReturnValue([{ keyword: "", results: [] }, mockSetValues]);

        render(
            <MemoryRouter>
                <SearchInput />
            </MemoryRouter>
        );

        const submitButton = screen.getByRole("button", { name: /search/i });
        fireEvent.click(submitButton);

        expect(axios.get).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Please enter a keyword to search");
    });
});