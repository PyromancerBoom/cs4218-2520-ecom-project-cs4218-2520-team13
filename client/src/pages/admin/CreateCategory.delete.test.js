import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import CreateCategory from "./CreateCategory";
import toast from "react-hot-toast";

// Priyansh Bimbisariye, A0265903B
// suppress act() warnings
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (args[0]?.includes?.('Warning: An update to') && args[0]?.includes?.('not wrapped in act')) {
            return;
        }
        originalError.call(console, ...args);
    };
});
afterAll(() => {
    console.error = originalError;
});

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
jest.mock("antd", () => ({
    Modal: ({ children, visible, onCancel }) => visible ? (
        <div data-testid="modal">
            {children}
            <button data-testid="modal-cancel" onClick={onCancel}>Cancel</button>
        </div>
    ) : null
}));

// Priyansh Bimbisariye, A0265903B
describe("CreateCategory Component - Deletion Logic", () => {
    let consoleSpy;
    let mockCategories;
    let confirmSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
        mockCategories = [
            { _id: "1", name: "Electronics" },
            { _id: "2", name: "Books" },
            { _id: "3", name: "Clothing" },
        ];

        axios.get.mockResolvedValue({
            data: { success: true, category: mockCategories }
        });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        confirmSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Successful Deletion", () => {

        // Priyansh Bimbisariye, A0265903B
        it("should delete category successfully and refresh list", async () => {
            // arrange
            axios.delete.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1");
                expect(toast.success).toHaveBeenCalledWith("Category is deleted");
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should verify category removed from UI after deletion", async () => {
            // arrange
            axios.delete.mockResolvedValue({
                data: { success: true }
            });

            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: [
                        { _id: "2", name: "Books" },
                        { _id: "3", name: "Clothing" },
                    ]
                }
            });

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1");
            });
            await waitFor(() => {
                expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
                expect(screen.getByText("Books")).toBeInTheDocument();
                expect(screen.getByText("Clothing")).toBeInTheDocument();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Error Handling", () => {
        // Priyansh Bimbisariye, A0265903B
        it("should handle server error response", async () => {
            // arrange
            axios.delete.mockResolvedValue({
                data: { success: false, message: "Cannot delete category with products" }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalledWith("/api/v1/category/delete-category/1");
                expect(toast.error).toHaveBeenCalledWith("Cannot delete category with products");
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle malformed API response", async () => {
            // arrange
            axios.delete.mockResolvedValue({});
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalled();
                expect(toast.success).not.toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("UX and Edge Cases", () => {
        // Priyansh Bimbisariye, A0265903B
        it("should require confirmation dialog before deleting", async () => {
            confirmSpy.mockReturnValue(false);
            axios.delete.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);
            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this category?");
                expect(axios.delete).not.toHaveBeenCalled();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle deletion of non-existent category (404)", async () => {
            // negative testing and bva
            // arrange
            axios.delete.mockResolvedValue({
                data: { success: false, message: "Category not found" }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(axios.delete).toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith("Category not found");
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should validate category ID before deleting", async () => {
            // bva and negative testing
            // arrange
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: [{ _id: undefined, name: "Invalid" }]
                }
            });

            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Invalid"));

            const deleteButtons = screen.getAllByText("Delete");

            // act
            fireEvent.click(deleteButtons[0]);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Invalid category ID");
                expect(axios.delete).not.toHaveBeenCalled();
                expect(window.confirm).not.toHaveBeenCalled();
            });
        });
    });
});
