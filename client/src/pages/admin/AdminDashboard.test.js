import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../context/auth";

// Priyansh Bimbisariye, A0265903B
jest.mock("../../components/Layout", () => {
  const Layout = ({ children }) => <div data-testid="layout">{children}</div>;
  Layout.displayName = "MockLayout";
  return { __esModule: true, default: Layout };
});
jest.mock("../../components/AdminMenu", () => {
  const AdminMenu = () => <div data-testid="admin-menu">AdminMenu</div>;
  AdminMenu.displayName = "MockAdminMenu";
  return { __esModule: true, default: AdminMenu };
});
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

// Priyansh Bimbisariye, A0265903B
describe("AdminDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Priyansh Bimbisariye, A0265903B
  // EP - valid partition - valid auth data
  describe("with valid auth data", () => {
    const mockAuth = {
      user: {
        name: "Jane Snow",
        email: "jane@admin.com",
        phone: "91234567",
      },
      token: "mock-jwt-token",
    };

    beforeEach(() => {
      useAuth.mockReturnValue([mockAuth]);
    });

    // sub-partition - full user object supplied
    it("displays admin name, email, and phone", () => {
      // act
      render(<AdminDashboard />);

      // assert
      expect(screen.getByText(/Jane Snow/)).toBeInTheDocument();
      expect(screen.getByText(/jane@admin.com/)).toBeInTheDocument();
      expect(screen.getByText(/91234567/)).toBeInTheDocument();
    });

    // sub-parition - ui text contract
    it("displays the correct label prefixes", () => {
      // act
      render(<AdminDashboard />);

      // asser
      expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("resilience - missing auth data", () => {
    // should never crash ungracefully
    it("renders without crashing when auth is null", () => {
      // arrange
      useAuth.mockReturnValue([null]);

      // act
      render(<AdminDashboard />);

      // assert
      expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
      expect(screen.queryByText("null")).not.toBeInTheDocument();
      expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    });

    // auth object is present (has token) but the user
    // property is null - partially hydrated context
    it("renders without crashing when auth.user is null", () => {
      // arrange
      useAuth.mockReturnValue([{ user: null, token: "some-token" }]);

      // act
      render(<AdminDashboard />);

      // assert
      expect(screen.getByText(/Admin Name :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Email :/)).toBeInTheDocument();
      expect(screen.getByText(/Admin Contact :/)).toBeInTheDocument();
      expect(screen.queryByText("null")).not.toBeInTheDocument();
      expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("component composition", () => {
    beforeEach(() => {
      useAuth.mockReturnValue([
        { user: { name: "A", email: "B", phone: "C" }, token: "t" },
      ]);
    });

    it("renders the AdminMenu component", () => {
      // act
      render(<AdminDashboard />);

      // assert
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    });

    it("renders within the Layout wrapper", () => {
      // act
      render(<AdminDashboard />);

      // assert
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
  });
});
