import React from 'react';
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
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

describe("Users Component Unit Tests ", () => {
    const mockUsers = [
        { _id: "1", name: "User One", email: "one@test.com", phone: "123", role: 0 },
        { _id: "2", name: "Admin Two", email: "two@test.com", phone: "456", role: 1 },
        { _id: "3", name: "Admin Three", email: "three@test.com", phone: "789", role: 1 },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue([{ user: { _id: "admin_id" } }]);
        window.confirm = jest.fn();
    });

    //  Rendering & UI Consistency 
    describe("Initialization & UI Rendering", () => {

        //LOU,YING-WEN A0338250J
        test("should fetch and render users successfully", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: mockUsers } });

            render(<Users />);

            await waitFor(() => {
                expect(screen.getByText("User One")).toBeInTheDocument();
                expect(screen.getByText("Admin Two")).toBeInTheDocument();
                expect(screen.getByText("Admin Three")).toBeInTheDocument();
            });
        });

        //LOU,YING-WEN A0338250J
        test("should render correct button styles based on user roles", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: mockUsers } });

            render(<Users />);

            await waitFor(() => {
                const adminBtns = screen.getAllByRole('button', { name: /^admin$/i });
                const userBtn = screen.getByRole('button', { name: /^user$/i });

                expect(adminBtns[0]).toHaveClass("btn-danger");
                expect(userBtn).toHaveClass("btn-success");
            });
        });

        //LOU,YING-WEN A0338250J
        test("should render empty state when user list is empty", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: [] } });

            render(<Users />);

            await waitFor(() => {
                expect(screen.getByText(/No users found/i)).toBeInTheDocument();
                expect(screen.getByText("All Users List")).toBeInTheDocument();
                expect(screen.getByText("#")).toBeInTheDocument();
                expect(screen.getByText("Name")).toBeInTheDocument();
                expect(screen.getByText("Email")).toBeInTheDocument();
                expect(screen.getByText("Phone")).toBeInTheDocument();
                expect(screen.getByText("Actions")).toBeInTheDocument();
            });
        });
    });

    //  User Actions & Persistence 
    describe("User Actions (Delete & Role Update)", () => {
        //LOU,YING-WEN A0338250J
        test("should delete user successfully", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
            axios.delete.mockResolvedValue({ data: { success: true } });
            window.confirm.mockReturnValue(true);

            render(<Users />);
            const deleteBtn = await screen.findByRole('button', { name: /delete/i });
            await act(async () => { fireEvent.click(deleteBtn); });

            expect(toast.success).toHaveBeenCalledWith("User deleted successfully");
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        //LOU,YING-WEN A0338250J
        test("should update role successfully", async () => {
            const multipleAdmins = [mockUsers[1], mockUsers[2]];
            axios.get.mockResolvedValue({ data: { success: true, users: multipleAdmins } });
            axios.put.mockResolvedValue({ data: { success: true } });
            render(<Users />);

            const adminBtns = await screen.findAllByRole('button', { name: /^admin$/i });
            fireEvent.click(adminBtns[0]);

            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith(
                    expect.stringContaining("/update-role/2"),
                    { role: 0 }
                );
                expect(toast.success).toHaveBeenCalledWith("Role updated!");
                expect(axios.get).toHaveBeenCalledTimes(2);
            });

        });

        //LOU,YING-WEN A0338250J
        test("should return early if deletion is cancelled by user", async () => {
            axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
            window.confirm.mockReturnValue(false);

            render(<Users />);
            const deleteBtn = await screen.findByRole('button', { name: /delete/i });
            fireEvent.click(deleteBtn);

            expect(axios.delete).not.toHaveBeenCalled();
        });
    });

    // Safety Guard Logic
    describe("Safety & Guard Logic Verification", () => {
        //LOU,YING-WEN A0338250J
        test("should disable buttons according to safety logic (isMe & isLastAdmin)", async () => {
            const singleAdmin = [{ _id: "admin_id", name: "Me", role: 1 }];
            useAuth.mockReturnValue([{ user: { _id: "admin_id" } }]);
            axios.get.mockResolvedValue({ data: { success: true, users: singleAdmin } });

            render(<Users />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /^admin$/i })).toBeDisabled();
                expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
            });
        });

        //LOU,YING-WEN A0338250J
        test("should display warning title when the last admin is disabled", async () => {
            const singleAdmin = [{ _id: "admin_id", name: "SuperAdmin", role: 1 }];
            axios.get.mockResolvedValue({ data: { success: true, users: singleAdmin } });

            render(<Users />);
            const adminBtn = await screen.findByRole('button', { name: /^admin$/i });
            expect(adminBtn).toBeDisabled();
            expect(adminBtn).toHaveAttribute("title", "Cannot demote the last admin");
        });
    });

    describe("Error Handling Scenarios", () => {
        // Line 16 coverage: Catch block of getUsers
        //LOU,YING-WEN A0338250J
        test("should handle catch block during getUsers", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            axios.get.mockRejectedValueOnce(new Error("Fetch Failed"));

            render(<Users />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting users");
                expect(consoleSpy).toHaveBeenCalled();
            });
            consoleSpy.mockRestore();
        });

        //LOU,YING-WEN A0338250J
        test("should not show success toast when delete API returns success: false", async () => {
            const targetUser = { _id: "123", name: "Test User", role: 0 };
            axios.get.mockResolvedValueOnce({ data: { success: true, users: [targetUser] } });
            axios.delete.mockResolvedValueOnce({ data: { success: false } });
            window.confirm.mockReturnValue(true);

            render(<Users />);
            const deleteBtn = await screen.findByRole('button', { name: /delete/i });
            fireEvent.click(deleteBtn);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });

        //LOU,YING-WEN A0338250J
        test("should not show success toast when update role API returns success: false", async () => {
            const targetUser = { _id: "123", name: "Test User", role: 0 };
            axios.get.mockResolvedValueOnce({ data: { success: true, users: [targetUser] } });
            axios.put.mockResolvedValueOnce({ data: { success: false } });

            render(<Users />);
            const roleBtn = await screen.findByRole('button', { name: /^user$/i });
            fireEvent.click(roleBtn);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to update role");
                expect(axios.get).toHaveBeenCalledTimes(1);
            });
        });

        //LOU,YING-WEN A0338250J
        test("should show specific error message from API when success is false", async () => {
            axios.get.mockResolvedValueOnce({
                data: { success: false, message: "Custom Backend Error" }
            });

            render(<Users />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Custom Backend Error");
            });
        });

        //LOU,YING-WEN A0338250J
        test("should show default error message when success is false and no message provided", async () => {
            axios.get.mockResolvedValueOnce({
                data: { success: false }
            });

            render(<Users />);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Failed to fetch users");
            });
        });

        //LOU,YING-WEN A0338250J
        test("should show error toast when delete API throws an error", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const targetUser = { _id: "123", name: "Test User", role: 0 };

            axios.get.mockResolvedValueOnce({ data: { success: true, users: [targetUser] } });
            axios.delete.mockRejectedValueOnce(new Error("Network Error"));
            window.confirm.mockReturnValue(true);

            render(<Users />);
            const deleteBtn = await screen.findByRole('button', { name: /delete/i });
            fireEvent.click(deleteBtn);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
            });

            consoleSpy.mockRestore();
        });

        //LOU,YING-WEN A0338250J
        test("should show error toast when update role API throws an error", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const targetUser = { _id: "123", name: "Test User", role: 0 };
            axios.get.mockResolvedValueOnce({ data: { success: true, users: [targetUser] } });
            axios.put.mockRejectedValueOnce(new Error("Update Failed"));

            render(<Users />);
            const roleBtn = await screen.findByRole('button', { name: /^user$/i });
            fireEvent.click(roleBtn);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith("Failed to update role");
            });

            consoleSpy.mockRestore();
        });
    });

});