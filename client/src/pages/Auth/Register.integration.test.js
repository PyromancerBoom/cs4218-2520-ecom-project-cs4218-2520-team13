import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import Register from "./Register";
import { AuthProvider } from "../../context/auth";

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
const renderRegisterPage = () => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
};

// Priyansh Bimbisariye, A0265903B
const fillAndSubmitForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
    target: { value: "John Wick" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
    target: { value: "john.wick@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
    target: { value: "BabaYaga123" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
    target: { value: "Kent Ridge" },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
    target: { value: "1990-09-02" },
  });
  fireEvent.change(
    screen.getByPlaceholderText("What is Your Favorite sports"),
    { target: { value: "Fencing" } },
  );
  fireEvent.click(screen.getByRole("button", { name: /register/i }));
};

// Priyansh Bimbisariye, A0265903B
describe("Register page integration", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    console.log.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should navigate to login page after successful registration", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () => {
        return HttpResponse.json({
          success: true,
          message: "User registered successfully",
        });
      }),
    );

    renderRegisterPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast and stay on register page when server rejects with success false", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () => {
        return HttpResponse.json({
          success: false,
          message: "Email already exists",
        });
      }),
    );

    renderRegisterPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });

    expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show the server error message when server returns 400, not a generic fallback", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () => {
        return HttpResponse.json(
          { message: "Name is Required" },
          { status: 400 },
        );
      }),
    );

    renderRegisterPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Name is Required")).toBeInTheDocument();
    });

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show the server error message when server returns 409 for duplicate email", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () => {
        return HttpResponse.json(
          { success: false, message: "Already registered please login" },
          { status: 409 },
        );
      }),
    );

    renderRegisterPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(
        screen.getByText("Already registered please login"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show generic fallback toast when the network request fails entirely", async () => {
    server.use(
      http.post("*/api/v1/auth/register", () => {
        return HttpResponse.error();
      }),
    );

    renderRegisterPage();
    fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
  });
});
