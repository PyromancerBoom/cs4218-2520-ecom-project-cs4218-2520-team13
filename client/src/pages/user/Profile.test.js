import React from 'react';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import axios from "axios";
import { useAuth } from "../../context/auth";
import toast from "react-hot-toast";
import "@testing-library/jest-dom";

// Mock external dependencies to isolate the Profile component
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../context/auth");
jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu">UserMenu</div>);
jest.mock("./../../components/Layout", () => ({ children, title }) => (
    <div><h1>{title}</h1>{children}</div>
));

//LOU,YING-WEN A0338250J
describe("Profile Component Unit Test", () => {
    const mockUser = {
        name: "Old Name",
        email: "test@test.com",
        phone: "123456",
        address: "Old Address",
    };

    const mockAuth = {
        user: mockUser,
        token: "mock-token"
    };

    beforeEach(() => {
        // Clear all mocks and reset localStorage before each test
        jest.clearAllMocks();

        // Mock useAuth to return current auth state and a setter function
        useAuth.mockReturnValue([mockAuth, jest.fn()]);

        // Mock localStorage methods
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(() => JSON.stringify(mockAuth)),
                setItem: jest.fn(),
            },
            writable: true,
        });
    });

    test("should pre-fill form with user data from context on mount", () => {
        // Arrange
        // (Uses beforeEach mockAuth)

        // Act
        render(<Profile />);

        // Assert
        expect(screen.getByPlaceholderText(/Enter Your Name/i).value).toBe(mockUser.name);
        expect(screen.getByPlaceholderText(/Enter Your Phone/i).value).toBe(mockUser.phone);
        expect(screen.getByPlaceholderText(/Enter Your Address/i).value).toBe(mockUser.address);
        expect(screen.getByPlaceholderText(/Enter Your Email/i).value).toBe(mockUser.email);
    });

    test("should have the email field disabled", () => {
        // Arrange

        // Act
        render(<Profile />);

        // Assert
        expect(screen.getByPlaceholderText(/Enter Your Email/i)).toBeDisabled();
    });

    test("should update all profile fields and localStorage successfully upon submission", async () => {
        // Arrange: Mock successful API response
        const updatedUser = {
            name: "New Name",
            email: "test@test.com",
            phone: "999999",
            address: "New Address"
        };
        axios.put.mockResolvedValue({
            data: { success: true, updatedUser }
        });

        render(<Profile />);

        // Act: Modify every changeable field
        fireEvent.change(screen.getByPlaceholderText(/Enter Your Name/i), { target: { value: "New Name" } });
        fireEvent.change(screen.getByPlaceholderText(/Enter Your Password/i), { target: { value: "secret123" } });
        fireEvent.change(screen.getByPlaceholderText(/Enter Your Phone/i), { target: { value: "999999" } });
        fireEvent.change(screen.getByPlaceholderText(/Enter Your Address/i), { target: { value: "New Address" } });

        fireEvent.click(screen.getByText(/UPDATE/i));

        // Assert: Verify API call contains ALL attributes
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
                name: "New Name",
                email: "test@test.com", // Email remains the same as it is disabled
                password: "secret123",
                phone: "999999",
                address: "New Address"
            });
        });

        // Assert: Verify side effects
        expect(localStorage.setItem).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
    });

    test("should not call API and show error if name is empty", async () => {
        // Arrange: No need to mock axios.put since it should not be called
        render(<Profile />);

        //Act: Clear the name field
        const nameInput = screen.getByPlaceholderText(/Enter Your Name/i);
        fireEvent.change(nameInput, { target: { value: "" } });
        fireEvent.click(screen.getByText(/UPDATE/i));

        // Assert: Verify API was not called and error toast shown
        expect(axios.put).not.toHaveBeenCalled();
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Name is required");
        });
    });

    test("should display 'Something went wrong' when API call throws an error", async () => {
        // Arrange: Mock axios.put to reject with an error
        axios.put.mockRejectedValue(new Error("Network Error"));
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        render(<Profile />);

        // Act: Trigger the submit
        fireEvent.click(screen.getByText(/UPDATE/i));

        // Assert: Verify the error toast and console log
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });

});