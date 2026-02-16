import React from 'react';
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import Users from "./Users";
import axios from "axios";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";

// Mock external dependencies
jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("react-hot-toast");
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div><h1>{title}</h1>{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => <div>AdminMenu</div>);

//LOU,YING-WEN A0338250J
describe("Users Component Unit Tests", () => {
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


    // Success Path Tests
    test("should fetch and render users successfully", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: mockUsers } });

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText("User One")).toBeInTheDocument();
            expect(screen.getByText("Admin Two")).toBeInTheDocument();
        });
    });

    test("should delete user successfully", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        axios.delete.mockResolvedValue({ data: { success: true } });
        window.confirm.mockReturnValue(true);

        render(<Users />);
        const deleteBtn = await screen.findByRole('button', { name: /delete/i });

        // Act
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        // Assert
        expect(toast.success).toHaveBeenCalledWith("User deleted successfully");
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test("should update role successfully", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[1], mockUsers[2]] } });
        axios.put.mockResolvedValue({ data: { success: true } });
        render(<Users />);

        const adminBtns = await screen.findAllByRole('button', { name: /^admin$/i });

        // Act
        await act(async () => {
            fireEvent.click(adminBtns[0]);
        });

        // Assert
        expect(axios.put).toHaveBeenCalledWith(expect.stringContaining("/update-role/2"), { role: 0 });
        expect(toast.success).toHaveBeenCalledWith("Role updated!");
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    // Branch & Logic Tests
    test("should disable buttons according to safety logic", async () => {
        // Arrange
        const singleAdmin = [{ _id: "admin_id", name: "Me", role: 1 }];
        useAuth.mockReturnValue([{ user: { _id: "admin_id" } }]);
        axios.get.mockResolvedValue({ data: { success: true, users: singleAdmin } });

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^admin$/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
        });
    });

    test("should handle API success false for handleDelete", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        axios.delete.mockResolvedValue({ data: { success: false } });
        window.confirm.mockReturnValue(true);
        render(<Users />);

        // Act
        const deleteBtn = await screen.findByRole('button', { name: /delete/i });
        await act(async () => { fireEvent.click(deleteBtn); });

        // Assert
        expect(toast.success).not.toHaveBeenCalled();
    });

    test("should handle API success false for handleUpdateRole", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        axios.put.mockResolvedValue({ data: { success: false } });
        render(<Users />);

        // Act
        const roleBtn = await screen.findByRole('button', { name: /^user$/i });
        await act(async () => { fireEvent.click(roleBtn); });

        // Assert
        expect(toast.success).not.toHaveBeenCalled();
    });

    test("should handle API success false for getUsers", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: false, users: [mockUsers[0]] } });

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        expect(screen.queryByText("User One")).not.toBeInTheDocument();
    });

    test("should return early if deletion is cancelled", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        window.confirm.mockReturnValue(false);
        render(<Users />);
        const deleteBtn = await screen.findByRole('button', { name: /delete/i });

        // Act
        fireEvent.click(deleteBtn);

        // Assert
        expect(axios.delete).not.toHaveBeenCalled();
    });

    test("should render empty state when user list is empty", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [] } });

        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText(/No users found/i)).toBeInTheDocument();
        });
    });

    // Error Handling Tests
    test("should handle error in getUsers catch block", async () => {
        // Arrange
        axios.get.mockRejectedValueOnce(new Error("Fetch Failed"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        // Act
        render(<Users />);

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in getting users");
        });
    });

    test("should handle error in handleDelete catch block", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        axios.delete.mockRejectedValueOnce(new Error("Delete Failed"));
        window.confirm.mockReturnValue(true);
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        render(<Users />);
        const deleteBtn = await screen.findByRole('button', { name: /delete/i });

        // Act
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
        });
    });

    test("should handle error in handleUpdateRole catch block", async () => {
        // Arrange
        axios.get.mockResolvedValue({ data: { success: true, users: [mockUsers[0]] } });
        axios.put.mockRejectedValueOnce(new Error("Update Failed"));
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        render(<Users />);
        const roleBtn = await screen.findByRole('button', { name: /^user$/i });

        // Act
        await act(async () => {
            fireEvent.click(roleBtn);
        });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Failed to update role");
        });
    });
});