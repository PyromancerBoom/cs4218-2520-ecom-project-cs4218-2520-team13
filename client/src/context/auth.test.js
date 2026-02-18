import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

// Priyansh Bimbisariye, A0265903B

// Mock axios
jest.mock("axios");

// Reset between tests
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
});

// wrapper for AuthProvider
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthProvider & useAuth", () => {
    // state-based - initial state, with partition of no localStorage data
    it("should have initial state with null user and empty token", () => {
        // arrange
        // (no localStorage data)
        // act
        const { result } = renderHook(() => useAuth(), { wrapper });
        // assert
        const [auth] = result.current;
        expect(auth).toEqual({ user: null, token: "" });
    });

    // state-based - hydration, with partition of valid localStorage data
    it("should hydrate auth state from localStorage on mount", async () => {
        // arrange
        const storedAuth = {
            user: { id: 1, name: "John Snow", email: "john@test.com" },
            token: "storedToken123",
        };
        localStorage.setItem("auth", JSON.stringify(storedAuth));
        // act
        const { result } = renderHook(() => useAuth(), { wrapper });
        // assert
        await waitFor(() => {
            const [auth] = result.current;
            expect(auth.user).toEqual(storedAuth.user);
            expect(auth.token).toBe("storedToken123");
        });
    });

    // state-based - no change, with partition of empty localStorage
    it("should not update state when localStorage has no auth data", async () => {
        // arrange
        // (localStorage is empty)
        // act
        const { result } = renderHook(() => useAuth(), { wrapper });
        // assert
        await waitFor(() => {
            const [auth] = result.current;
            expect(auth).toEqual({ user: null, token: "" });
        });
    });

    // partition - malformed localStorage data. invalid data partition
    // puts broken json in localStorage
    // then checks that rendering the component doesn't crash the entire app
    it("should handle malformed JSON in localStorage gracefully", async () => {
        // arrange
        localStorage.setItem("auth", "{invalid-json}08320832");
        // act & assert — should not crash the component
        expect(() => {
            renderHook(() => useAuth(), { wrapper });
        }).not.toThrow();
    });

    // behavioral spec - side effect verification
    // axios header syncs with token
    it("should set axios Authorization header when auth has a token", async () => {
        // arrange
        const storedAuth = {
            user: { id: 1, name: "Priyansh" },
            token: "myToken456",
        };
        localStorage.setItem("auth", JSON.stringify(storedAuth));
        // act
        renderHook(() => useAuth(), { wrapper });
        // assert
        await waitFor(() => {
            expect(axios.defaults.headers.common["Authorization"]).toBe(
                "myToken456"
            );
        });
    });

    // state-based - mutation via setAuth
    // setAuth updates state
    it("should allow updating auth state via setAuth", async () => {
        // arrange
        const { result } = renderHook(() => useAuth(), { wrapper });
        // act
        act(() => {
            const [, setAuth] = result.current;
            setAuth({
                user: { id: 2, name: "Updated User" },
                token: "newToken789",
            });
        });
        // assert
        await waitFor(() => {
            const [auth] = result.current;
            expect(auth.user).toEqual({ id: 2, name: "Updated User" });
            expect(auth.token).toBe("newToken789");
        });
    });
});
