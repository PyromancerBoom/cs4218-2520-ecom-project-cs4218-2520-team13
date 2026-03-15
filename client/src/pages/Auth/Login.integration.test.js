import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import Login from "./Login";
import { AuthProvider } from "../../context/auth";

// unrelated mocks
jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Priyansh Bimbisariye, A0265903B
// helper to render the Login page with necessary context and routing
const renderLoginPage = () => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route
            path="/forgot-password"
            element={<div>Forgot Password Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
};

// Priyansh Bimbisariye, A0265903B
// fill in the login form and submit it
// helper
const fillAndSubmitForm = (
  email = "john@example.com",
  password = "password123",
) => {
  fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /login/i }));
};

// Priyansh Bimbisariye, A0265903B
describe("Login page integration", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    console.log.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should store auth data in local storage and navigate to home after successful login", async () => {
    const mockUser = { name: "John", email: "john@example.com", role: 0 };
    const mockToken = "fake-jwt-token-123";

    server.use(
      http.post("*/api/v1/auth/login", () => {
        return HttpResponse.json({
          success: true,
          message: "Login successfully",
          user: mockUser,
          token: mockToken,
        });
      }),
    );

    renderLoginPage();
    fillAndSubmitForm();

    // nav to hp
    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    // asserts
    const stored = JSON.parse(localStorage.getItem("auth"));
    expect(stored).toBeTruthy();
    expect(stored.user).toEqual(mockUser);
    expect(stored.token).toBe(mockToken);
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast and not set localStorage when server returns success false", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () => {
        return HttpResponse.json({
          success: false,
          message: "Invalid email or password",
        });
      }),
    );

    renderLoginPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });

    expect(localStorage.getItem("auth")).toBeNull();
    expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show the server error message when server returns 401, not a generic fallback", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () => {
        return HttpResponse.json(
          { success: false, message: "Invalid Password" },
          { status: 401 },
        );
      }),
    );

    renderLoginPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Invalid Password")).toBeInTheDocument();
    });
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(localStorage.getItem("auth")).toBeNull();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show generic fallback toast when the network request fails entirely", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () => {
        return HttpResponse.error();
      }),
    );

    renderLoginPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    expect(localStorage.getItem("auth")).toBeNull();
    expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should restore session on page reload", async () => {
    const mockUser = { name: "John", email: "john@example.com", role: 0 };
    const mockToken = "persisted-token-456";

    localStorage.setItem(
      "auth",
      JSON.stringify({
        success: true,
        user: mockUser,
        token: mockToken,
      }),
    );

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText("John")).toBeInTheDocument();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should navigate to forgot password page when the forgot password button is clicked", async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));

    await waitFor(() => {
      expect(screen.getByText("Forgot Password Page")).toBeInTheDocument();
    });
  });
});
