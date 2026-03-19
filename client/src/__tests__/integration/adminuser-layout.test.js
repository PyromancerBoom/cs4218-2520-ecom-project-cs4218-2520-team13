// A0338250J LOU, YING-WEN
import React from 'react';
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import Users from "../../pages/admin/Users";

jest.mock("axios");
jest.mock("react-hot-toast");

describe("Users Page Integration Tests", () => {

    beforeAll(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation((msg) => {
            if (msg.includes('validateDOMNesting')) return;
        });
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterAll(() => {
        consoleSpy.mockRestore();
        jest.restoreAllMocks();
    });

    test("should render all user information correctly when API call is successful", async () => {
        const mockUsers = [
            {
                _id: "1",
                name: "Sandra",
                email: "sandra@test.com",
                phone: "8888",
                address: "123 React Lane",
                role: 0
            }
        ];

        // 2. Use mockResolvedValue on the mocked axios instance
        axios.get.mockResolvedValue({
            data: {
                success: true,
                users: mockUsers
            }
        });

        render(
            <MemoryRouter initialEntries={["/dashboard/admin/users"]}>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Users />
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        // 3. Use a more robust check for the loading state
        await waitFor(() => {
            expect(screen.getByText("Sandra")).toBeInTheDocument();
        }, { timeout: 3000 });

        expect(screen.getByText("sandra@test.com")).toBeInTheDocument();
        expect(screen.getByText("123 React Lane")).toBeInTheDocument();
    });

    test("should display error toast when API success is false", async () => {
        // Match the logic in your Users.js: if (!data?.success)
        axios.get.mockResolvedValue({
            data: {
                success: false,
                message: "Internal Server Error"
            }
        });

        render(
            <MemoryRouter>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Users />
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Internal Server Error");
        });
    });

    test("should handle network errors and show generic error toast", async () => {
        // Force a rejection to trigger the catch block
        axios.get.mockRejectedValue(new Error("Network Error"));

        render(
            <MemoryRouter>
                <AuthProvider>
                    <SearchProvider>
                        <CartProvider>
                            <Users />
                        </CartProvider>
                    </SearchProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting users");
        });
    });
});