import React from 'react';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import axios from "axios";
import { useAuth } from "../../context/auth";
import toast from "react-hot-toast";
import "@testing-library/jest-dom";

// Mock dependencies
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../context/auth");

// Custom UI Mocks to differentiate from classmates
jest.mock("../../components/UserMenu", () => {
    return function ProfileMenu() {
        return <div data-testid="profile-menu">Profile Menu</div>;
    };
});

jest.mock("./../../components/Layout", () => {
    return function ProfileLayout({ children, title }) {
        return (
            <div data-testid="profile-layout">
                <header data-testid="header-title">{title}</header>
                <main>{children}</main>
            </div>
        );
    };
});

describe("User Profile Component Lifecycle and Interaction Tests", () => {
    const mockUserData = {
        name: "Sandra Lou",
        email: "sandralou@u.nus.edu",
        phone: "87654321",
        address: "Pioneer House",
    };

    const mockAuthContext = {
        user: mockUserData,
        token: "session-token-123"
    };

    const mockSetAuth = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue([mockAuthContext, mockSetAuth]);

        // Clean room for LocalStorage
        const storageMock = (() => {
            let store = { auth: JSON.stringify(mockAuthContext) };
            return {
                getItem: jest.fn(key => store[key] || null),
                setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
            };
        })();

        Object.defineProperty(window, 'localStorage', {
            value: storageMock,
            writable: true
        });
    });

    // Mounting and Initial Consistency
    describe("A) Component Mounting & State Initialization", () => {

        //LOU,YING-WEN A0338250J
        test("should sync input fields with Auth Context on load", () => {
            render(<Profile />);

            expect(screen.getByPlaceholderText(/Enter Your Name/i)).toHaveValue(mockUserData.name);
            expect(screen.getByPlaceholderText(/Enter Your Email/i)).toHaveValue(mockUserData.email);
            expect(screen.getByPlaceholderText(/Enter Your Phone/i)).toHaveValue(mockUserData.phone);
            expect(screen.getByPlaceholderText(/Enter Your Address/i)).toHaveValue(mockUserData.address);
            expect(screen.getByPlaceholderText(/Enter Your Password/i)).toHaveValue("");
        });

        //LOU,YING-WEN A0338250J
        test("should enforce security by disabling the email field", () => {

            render(<Profile />);

            expect(screen.getByPlaceholderText(/Enter Your Email/i)).toBeDisabled();
        });

        //LOU,YING-WEN A0338250J
        test("should render empty input fields when auth user data is absent", () => {
            useAuth.mockReturnValue([{ user: null }, mockSetAuth]);

            render(<Profile />);

            expect(screen.getByPlaceholderText(/Enter Your Name/i)).toHaveValue("");
            expect(screen.getByPlaceholderText(/Enter Your Email/i)).toHaveValue("");
            expect(screen.getByPlaceholderText(/Enter Your Phone/i)).toHaveValue("");
            expect(screen.getByPlaceholderText(/Enter Your Address/i)).toHaveValue("");
            expect(screen.getByPlaceholderText(/Enter Your Password/i)).toHaveValue("");
        });

        //LOU,YING-WEN A0338250J
        test("should correctly display UI components (Layout and Menu)", () => {

            render(<Profile />);

            expect(screen.getByTestId("profile-menu")).toBeInTheDocument();
            expect(screen.getByTestId("header-title")).toHaveTextContent("Your Profile");
        });
    });

    // Real-time Field Interactions (State updates)
    describe(" User Interaction and Real-time Validation", () => {
        //LOU,YING-WEN A0338250J
        test("should capture changes in the Password field", () => {
            render(<Profile />);
            const passwordField = screen.getByPlaceholderText(/Enter Your Password/i);

            fireEvent.change(passwordField, { target: { value: "newPass123" } });

            expect(passwordField.value).toBe("newPass123");
        });

        //LOU,YING-WEN A0338250J
        test("should capture changes in the Phone field", () => {
            render(<Profile />);
            const phoneField = screen.getByPlaceholderText(/Enter Your Phone/i);

            fireEvent.change(phoneField, { target: { value: "99988877" } });

            expect(phoneField.value).toBe("99988877");
        });

        //LOU,YING-WEN A0338250J
        test("should capture changes in the Address field", () => {
            render(<Profile />);

            const addressField = screen.getByPlaceholderText(/Enter Your Address/i);
            fireEvent.change(addressField, { target: { value: "123 Main St" } });

            expect(addressField.value).toBe("123 Main St");
        });

        //LOU,YING-WEN A0338250J
        test("should block the submission if name is erased", async () => {
            render(<Profile />);
            const nameField = screen.getByPlaceholderText(/Enter Your Name/i);

            fireEvent.change(nameField, { target: { value: "" } });
            fireEvent.click(screen.getByText("UPDATE"));

            expect(toast.error).toHaveBeenCalledWith("Name is required");
            expect(axios.put).not.toHaveBeenCalled();
        });
    });

    // Persistence and API Data Sync
    describe(" Data Persistence and Server Communication", () => {
        //LOU,YING-WEN A0338250J
        test("should execute successful update and preserve session token", async () => {
            const updatedProfile = { ...mockUserData, name: "Sandra Lou (Updated)" };
            axios.put.mockResolvedValue({ data: { updatedUser: updatedProfile } });

            render(<Profile />);
            fireEvent.change(screen.getByPlaceholderText(/Enter Your Name/i), { target: { value: "Sandra Lou (Updated)" } });
            fireEvent.click(screen.getByText("UPDATE"));

            await waitFor(() => {
                // Verify Context Update
                expect(mockSetAuth).toHaveBeenCalledWith(expect.objectContaining({ user: updatedProfile }));

                // Verify LocalStorage Preservation
                const storedAuth = JSON.parse(localStorage.setItem.mock.calls[0][1]);
                expect(storedAuth.token).toBe("session-token-123");
                expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
            });
        });

        //LOU,YING-WEN A0338250J
        test("should forward updated password and phone in the request payload", async () => {
            axios.put.mockResolvedValue({ data: { updatedUser: mockUserData } });
            render(<Profile />);

            fireEvent.change(screen.getByPlaceholderText(/Enter Your Password/i), { target: { value: "secret" } });
            fireEvent.change(screen.getByPlaceholderText(/Enter Your Phone/i), { target: { value: "123" } });
            fireEvent.click(screen.getByText("UPDATE"));

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
                    password: "secret",
                    phone: "123"
                }));
            });
        });

        //LOU,YING-WEN A0338250J
        test("should handle API validation failures returned in the body", async () => {
            const errorMessage = "Update rejected";
            axios.put.mockResolvedValue({ data: { error: errorMessage } });

            render(<Profile />);
            fireEvent.click(screen.getByText("UPDATE"));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(errorMessage);
            });
        });

        //LOU,YING-WEN A0338250J
        test("should manage network exceptions using the catch block", async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            axios.put.mockRejectedValue(new Error("Connection Timeout"));

            render(<Profile />);
            fireEvent.click(screen.getByText("UPDATE"));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
                expect(consoleSpy).toHaveBeenCalled();
            });
            consoleSpy.mockRestore();
        });
    });
});