import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import CreateCategory from "./CreateCategory";
import toast from "react-hot-toast";

// Mocking dependencies
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("./../../components/Layout", () => ({ children }) => <div data-testid="layout">{children}</div>);
jest.mock("./../../components/AdminMenu", () => () => <div data-testid="admin-menu">Admin Menu</div>);
jest.mock("../../components/Form/CategoryForm", () =>
    ({ value, setValue, handleSubmit }) => (
        <form data-testid="category-form" onSubmit={handleSubmit}>
            <input
                data-testid="category-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
            <button type="submit" data-testid="submit-btn">Submit</button>
        </form>
    )
);
jest.mock("antd", () => ({ Modal: ({ children, visible }) => visible ? <div data-testid="modal">{children}</div> : null }));
jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(() => [{ user: { name: "Admin", role: 1 }, token: "admin-token" }, jest.fn()]),
}));

// Priyansh Bimbisariye, A0265903B
describe("CreateCategory Component - Initial State and Data Fetching", () => {
    let mockCategories;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCategories = [
            { _id: "1", name: "Electronics" },
            { _id: "2", name: "Books" },
        ];
    });

    // Priyansh Bimbisariye, A0265903B
    it("should fetch and display categories on mount", async () => {
        // arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: mockCategories },
        });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });
        await waitFor(() => {
            expect(screen.getByText("Electronics")).toBeInTheDocument();
            expect(screen.getByText("Books")).toBeInTheDocument();
        });
    });

    // Priyansh Bimbisariye, A0265903B
    it("should handle an empty array response gracefully", async () => {
        // arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: [] },
        });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        // should only have header
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBe(1);
        expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    // Priyansh Bimbisariye, A0265903B
    it("should handle null category data gracefully", async () => {
        // arrange
        axios.get.mockResolvedValueOnce({
            data: { success: true, category: null },
        });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBe(1);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should fail gracefully when response data is undefined or malformed", async () => {
        // arrange
        axios.get.mockResolvedValueOnce({});
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");
        });

        consoleSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    it("should handle unsuccessful fetch without crashing", async () => {
        // arrange
        axios.get.mockResolvedValueOnce({
            data: { success: false, message: "Server Error" },
        });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBe(1);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should handle API network error gracefully", async () => {
        // arrange
        const errorMessage = "Network Error";
        axios.get.mockRejectedValueOnce(new Error(errorMessage));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        // act
        render(<CreateCategory />);

        // assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting category");

        consoleSpy.mockRestore();
    });
});
