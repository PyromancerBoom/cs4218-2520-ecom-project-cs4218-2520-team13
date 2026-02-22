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
    // using ep and state-based
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
    // using bva
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
    // using negative testing
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
    // using negative testing and bva
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
    // using negative testing and state-based
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
    // using negative testing
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

// Priyansh Bimbisariye, A0265903B
describe("CreateCategory Component - Category Creation (Form Logic)", () => {
    let consoleSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockResolvedValue({
            data: { success: true, category: [] }
        });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    // Priyansh Bimbisariye, A0265903B
    describe("When submitting valid category", () => {
        // using ep and state-based

        // Priyansh Bimbisariye, A0265903B
        it("should create category successfully and refresh list", async () => {
            // arrange
            axios.post.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'New Category' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: 'New Category' }
                );
                expect(toast.success).toHaveBeenCalledWith('New Category is created');
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        // ep
        it("should clear input field after successful creation", async () => {
            // arrange
            axios.post.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Books' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalled();
                expect(input.value).toBe('');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle special characters in category name", async () => {
            // ep - valid variation
            // arrange
            axios.post.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Tech & Gadgets! !@*$&^' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: 'Tech & Gadgets! !@*$&^' }
                );
                expect(toast.success).toHaveBeenCalledWith('Tech & Gadgets! !@*$&^ is created');
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("When submitting duplicate or invalid category", () => {
        // using ep and negative testing

        // Priyansh Bimbisariye, A0265903B
        it("should handle duplicate category error from server", async () => {
            // arrange
            axios.post.mockResolvedValue({
                data: { success: false, message: "Category Already Exists" }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Electronics' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalledWith(
                    '/api/v1/category/create-category',
                    { name: 'Electronics' }
                );
                expect(toast.error).toHaveBeenCalledWith('Category Already Exists');
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle server validation error", async () => {
            // ep and negative testing
            // arrange
            axios.post.mockResolvedValue({
                data: { success: false, message: "Invalid category name" }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Invalid@#$' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Invalid category name');
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("When submitting empty or invalid input", () => {
        // using bva and spec-based

        // Priyansh Bimbisariye, A0265903B
        it("should prevent empty string submission", async () => {
            // arrange
            axios.post.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const form = screen.getByTestId('category-form');

            // act
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).not.toHaveBeenCalled();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should prevent whitespace-only submission", async () => {
            // bva and spec-based
            // arrange
            axios.post.mockResolvedValue({
                data: { success: true }
            });
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: '   ' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).not.toHaveBeenCalled();
            });
        });
    });

    // Priyansh Bimbisariye, A0265903B
    describe("When network or API fails", () => {
        // using negative testing and resilience

        // Priyansh Bimbisariye, A0265903B
        it("should handle network error during creation", async () => {
            // arrange
            const networkError = new Error("Network Error");
            axios.post.mockRejectedValue(networkError);
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Books' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(networkError);
                expect(toast.error).toHaveBeenCalledWith('Something went wrong in input form');
                expect(input.value).toBe('Books');
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle malformed API response", async () => {
            // negative testing and resilience
            // arrange
            axios.post.mockResolvedValue({});
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Toys' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(axios.post).toHaveBeenCalled();
            });
        });

        // Priyansh Bimbisariye, A0265903B
        it("should handle undefined data response", async () => {
            // bva and resilience
            // arrange
            axios.post.mockResolvedValue(undefined);
            render(<CreateCategory />);
            await waitFor(() => expect(axios.get).toHaveBeenCalled());
            await waitFor(() => screen.getByTestId('category-input'));

            const input = screen.getByTestId('category-input');
            const form = screen.getByTestId('category-form');

            // act
            fireEvent.change(input, { target: { value: 'Games' } });
            fireEvent.submit(form);

            // assert
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith('Something went wrong in input form');
            });
        });
    });
});

