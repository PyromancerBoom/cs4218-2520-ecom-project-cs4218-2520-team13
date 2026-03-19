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

