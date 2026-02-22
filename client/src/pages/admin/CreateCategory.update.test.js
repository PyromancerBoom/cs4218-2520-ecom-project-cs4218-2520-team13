import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
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
jest.mock("antd", () => ({
    Modal: ({ children, visible, onCancel }) => visible ? (
        <div data-testid="modal">
            {children}
            <button data-testid="modal-cancel" onClick={onCancel}>Cancel</button>
        </div>
    ) : null
}));


// Priyansh Bimbisariye, A0265903B
describe("CreateCategory Component - Update Logic", () => {
    let consoleSpy;
    let mockCategories;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        mockCategories = [
            { _id: "1", name: "Electronics" },
            { _id: "2", name: "Books" },
        ];

        axios.get.mockResolvedValue({
            data: { success: true, category: mockCategories }
        });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Modal State Management", () => {
        // Priyansh Bimbisariye, A0265903B
        it("should open modal and set state when Edit button is clicked", async () => {
            // state-based testing
            // arrange
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");

            // act
            fireEvent.click(editButtons[0]);

            // assert
            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should close modal when cancel is triggered", async () => {
            // state-based testing
            // arrange
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const cancelButton = screen.getByTestId("modal-cancel");

            // act
            fireEvent.click(cancelButton);

            // assert
            await waitFor(() => {
                expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Valid Update Scenarios", () => {
        // Priyansh Bimbisariye, A0265903B
        it("should update category successfully with valid name", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Updated Electronics" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith(
                    "/api/v1/category/update-category/1",
                    { name: "Updated Electronics" }
                );
                expect(toast.success).toHaveBeenCalledWith("Updated Electronics is updated");
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle special characters in updated category name", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Tech & Gadgets! @#$" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith(
                    "/api/v1/category/update-category/1",
                    { name: "Tech & Gadgets! @#$" }
                );
                expect(toast.success).toHaveBeenCalledWith("Tech & Gadgets! @#$ is updated");
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should allow updating to same name", async () => {
            // partitioning
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalForm = within(modal).getByTestId("category-form");

            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith(
                    "/api/v1/category/update-category/1",
                    { name: "Electronics" }
                );
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Invalid Update Scenarios", () => {
        // using bva and negative testing

        // Priyansh Bimbisariye, A0265903B
        it("should prevent empty string update", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).not.toHaveBeenCalled();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should prevent whitespace-only update", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "   " } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).not.toHaveBeenCalled();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("Error Handling", () => {
        // using negative testing and resilience

        // Priyansh Bimbisariye, A0265903B
        it("should handle network error during update", async () => {
            // arrange
            const networkError = new Error("Network Error");
            axios.put.mockRejectedValue(networkError);
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Updated Name" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
                // modal should stay open on error
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle server validation error", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: false, message: "Category name already exists" }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Books" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Category name already exists");
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle malformed API response", async () => {
            // arrange
            axios.put.mockResolvedValue({});
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Updated" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalled();
                expect(toast.error).not.toHaveBeenCalled();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("State After Update", () => {

        // Priyansh Bimbisariye, A0265903B
        it("should clear updatedName after successful update", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "New Name" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalled();
                expect(toast.success).toHaveBeenCalledWith("New Name is updated");
                expect(modalInput.value).toBe("");
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should refresh category list after successful update", async () => {
            // arrange
            axios.put.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByText("Electronics"));

            const editButtons = screen.getAllByText("Edit");
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId("modal")).toBeInTheDocument();
            });

            const modal = screen.getByTestId("modal");
            const modalInput = within(modal).getByTestId("category-input");
            const modalForm = within(modal).getByTestId("category-form");

            // act
            fireEvent.change(modalInput, { target: { value: "Updated Electronics" } });
            fireEvent.submit(modalForm);

            // assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalled();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });
    });
});
