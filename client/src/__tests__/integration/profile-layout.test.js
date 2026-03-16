// A0338250J LOU, YING-WEN
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import Profile from "../../pages/user/Profile";
import { AuthProvider } from "../../context/auth";
import { SearchProvider } from "../../context/search";
import { CartProvider } from "../../context/cart";
import toast from "react-hot-toast";
import "@testing-library/jest-dom";

// Mock axios and react-hot-toast
jest.mock("axios");
jest.mock("react-hot-toast");

// Mocking UserMenu because it's a separate component, 
// keeping focus on Profile integration
jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu">User Menu</div>);

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

describe("User Profile Integration Tests", () => {
    const mockUser = {
        name: "John Doe",
        email: "john@example.com",
        phone: "12345678",
        address: "123 Street, NY",
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        // Setup initial localStorage
        localStorage.setItem("auth", JSON.stringify({ user: mockUser, token: "mock-token" }));
    });



    const renderProfile = () => {
        return render(
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <MemoryRouter>
                            <Profile />
                        </MemoryRouter>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        );
    };

    test("should pre-populate form with existing user data from auth context", async () => {
        renderProfile();

        // Verification: Data flows from AuthContext (via localStorage) to form fields
        expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(mockUser.name);
        expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue(mockUser.email);
        expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue(mockUser.phone);
        expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue(mockUser.address);
        expect(screen.getByPlaceholderText("Enter Your Email")).toBeDisabled();
    });

    test("should show error toast if name is empty and prevent submission", async () => {
        renderProfile();

        const nameInput = screen.getByPlaceholderText("Enter Your Name");
        const updateButton = screen.getByRole("button", { name: /UPDATE/i });

        // Clear name and submit
        fireEvent.change(nameInput, { target: { value: "" } });
        fireEvent.click(updateButton);

        expect(toast.error).toHaveBeenCalledWith("Name is required");
        expect(axios.put).not.toHaveBeenCalled();
    });

    test("should update profile successfully and sync data with context/localStorage", async () => {
        const updatedUser = { ...mockUser, name: "John Smith" };
        axios.put.mockResolvedValue({ data: { updatedUser } });

        renderProfile();

        const nameInput = screen.getByPlaceholderText("Enter Your Name");
        const updateButton = screen.getByRole("button", { name: /UPDATE/i });

        // Change name and submit
        fireEvent.change(nameInput, { target: { value: "John Smith" } });
        fireEvent.click(updateButton);

        await waitFor(() => {
            // 1. Check API call
            expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
                name: "John Smith"
            }));

            // 2. Check localStorage update
            const storedAuth = JSON.parse(localStorage.getItem("auth"));
            expect(storedAuth.user.name).toBe("John Smith");

            // 3. Check Success Toast
            expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
        });
    });

    test("should show error toast when API call fails", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.put.mockRejectedValue(new Error("Network Error"));

        renderProfile();

        const updateButton = screen.getByRole("button", { name: /UPDATE/i });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
        consoleSpy.mockRestore();

    });

    test("should show custom error toast when API returns error field", async () => {
        // Handling data.error from the component logic
        axios.put.mockResolvedValue({ data: { error: "Email already taken" } });

        renderProfile();

        const updateButton = screen.getByRole("button", { name: /UPDATE/i });
        fireEvent.click(updateButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Email already taken");
        });
    });

    test("should update user name in Header immediately after Profile update", async () => {
        const updatedUser = { ...mockUser, name: "John Smith" };
        axios.put.mockResolvedValue({ data: { updatedUser } });

        render(
            <AuthProvider>
                <SearchProvider>
                    <CartProvider>
                        <MemoryRouter>
                            <Profile />
                        </MemoryRouter>
                    </CartProvider>
                </SearchProvider>
            </AuthProvider>
        );

        // Verify initial name in Header
        expect(screen.getByText(mockUser.name)).toBeInTheDocument();

        // Perform Update
        const nameInput = await screen.findByPlaceholderText("Enter Your Name");
        fireEvent.change(nameInput, { target: { value: "John Smith" } });
        fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

        // Wait for API call and Context update
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
        });

        // Verify Header synchronization
        await waitFor(() => {
            // The old name should be gone or replaced
            expect(screen.queryByText(mockUser.name)).not.toBeInTheDocument();
            // The new name should appear in the Header (rendered via Layout)
            expect(screen.getByText("John Smith")).toBeInTheDocument();
        });

        expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
    });
});