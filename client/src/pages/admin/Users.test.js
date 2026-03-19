import React from 'react';
import { render, screen, waitFor } from "@testing-library/react";
import Users from "./Users";
import axios from "axios";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";

// --- Mock Dependencies ---
jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("react-hot-toast");
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div><h1>{title}</h1>{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => <div>AdminMenu</div>);

//A0338250J, LOU,YING-WEN
describe("Users Component Unit Tests (Read-Only Mode)", () => {
    const mockUsers = [
        { _id: "1", name: "User One", email: "one@test.com", phone: "123", role: 0 },
        { _id: "2", name: "Admin Two", email: "two@test.com", phone: "456", role: 1 },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue([{ user: { _id: "admin_id" } }]);
    });

    describe("Initialization & UI Rendering", () => {
        test("should fetch and render users successfully", async () => {
            // Mock API to return user list
            axios.get.mockResolvedValue({ data: { success: true, users: mockUsers } });

            render(<Users />);

            await waitFor(() => {
                expect(screen.getByText("User One")).toBeInTheDocument();
                expect(screen.getByText("Admin Two")).toBeInTheDocument();
                expect(screen.getByText("Admin")).toBeInTheDocument();
                expect(screen.getByText("User")).toBeInTheDocument();
            });
        });

        test("should NOT render any delete buttons", async () => {
            // Verify that delete functionality is removed from UI
            axios.get.mockResolvedValue({ data: { success: true, users: mockUsers } });

            render(<Users />);

            await waitFor(() => {
                expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
            });
        });

        test("should render empty state when user list is empty", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: [] } });

            render(<Users />);

            await waitFor(() => {
                expect(screen.getByText(/No users found/i)).toBeInTheDocument();
            });
        });
    });

    describe("Error Handling Scenarios", () => {
        test("should show toast error when API fetch fails", async () => {
            // Mock a network/server error
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            axios.get.mockRejectedValueOnce(new Error("Fetch Failed"));

            render(<Users />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting users");
            });
            consoleSpy.mockRestore();
        });

        test("should show error message when API returns success: false", async () => {
            // Mock API returning a custom error message
            axios.get.mockResolvedValueOnce({
                data: { success: false, message: "Custom Error" }
            });

            render(<Users />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Custom Error");
            });
        });

        test("should show default error message when API returns success: false without a message", async () => {
            // Mock API returning success: false but NO message field
            // This triggers the fallback: data?.message || "Failed to fetch users"
            axios.get.mockResolvedValueOnce({
                data: { success: false }
            });

            render(<Users />);

            await waitFor(() => {
                // Verify that the fallback string is used
                expect(toast.error).toHaveBeenCalledWith("Failed to fetch users");
            });
        });
    });
});