import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import Products from "../../pages/admin/Products";
import { AuthProvider } from "../../context/auth";

// Priyansh Bimbisariye, A0265903B

// header mocked (too many deps)
jest.mock("../../components/Header", () => {
  const React = require("react");
  return function MockHeader() {
    return React.createElement("div", { "data-testid": "mock-header" });
  };
});

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
    return { matches: false, addListener() { }, removeListener() { } };
  };

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockProducts = [
  {
    _id: "prod-1",
    name: "Laptop Pro",
    description: "High-performance laptop for developers",
    slug: "laptop-pro",
  },
  {
    _id: "prod-2",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with long battery life",
    slug: "wireless-mouse",
  },
];

const renderProductsPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
        <Routes>
          <Route path="/dashboard/admin/products" element={<Products />} />
          <Route
            path="/dashboard/admin/product/:slug"
            element={<div>Update Product Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

// Priyansh Bimbisariye, A0265903B
describe("Admin Products page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should fetch products from API and display them in cards", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: true, products: mockProducts }),
      ),
    );

    renderProductsPage();

    await waitFor(() =>
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument(),
    );

    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
    expect(
      screen.getByText("High-performance laptop for developers"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ergonomic wireless mouse with long battery life"),
    ).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/prod-1",
    );
    expect(images[1]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/prod-2",
    );

    const productLinks = document.querySelectorAll(
      'a[href*="/dashboard/admin/product/"]',
    );
    expect(productLinks[0]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/laptop-pro",
    );
    expect(productLinks[1]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/wireless-mouse",
    );
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show empty state when API returns no products", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: true, products: [] }),
      ),
    );

    renderProductsPage();

    await waitFor(() =>
      expect(screen.getByText("All Products List")).toBeInTheDocument(),
    );

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(
      document.querySelectorAll('a[href*="/dashboard/admin/product/"]'),
    ).toHaveLength(0);
  });


  // Priyansh Bimbisariye, A0265903B
  it("should navigate to update page when a product link is clicked", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: true, products: mockProducts }),
      ),
    );

    renderProductsPage();

    await waitFor(() =>
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument(),
    );

    fireEvent.click(
      document.querySelector('a[href="/dashboard/admin/product/laptop-pro"]'),
    );

    await waitFor(() =>
      expect(screen.getByText("Update Product Page")).toBeInTheDocument(),
    );
  });

  // Priyansh Bimbisariye, A0265903B
  it("should render AdminMenu with all navigation links", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: true, products: [] }),
      ),
    );

    renderProductsPage();

    await waitFor(() =>
      expect(screen.getByText("Admin Panel")).toBeInTheDocument(),
    );

    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create Product" }),
    ).toHaveAttribute("href", "/dashboard/admin/create-product");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/dashboard/admin/orders",
    );
  });

  // Priyansh Bimbisariye, A0265903B
  it("should render Layout with correct page title and page structure", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: true, products: [] }),
      ),
    );

    renderProductsPage();

    await waitFor(() =>
      expect(document.title).toBe("Ecommerce app - shop now"),
    );

    expect(document.querySelector("main")).toBeInTheDocument();

    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should not fetch products when auth token is missing", async () => {
    const apiCallSpy = jest.fn();

    server.use(
      http.get("*/api/v1/product/get-product", () => {
        apiCallSpy();
        return HttpResponse.json({ success: true, products: mockProducts });
      }),
    );

    renderProductsPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(apiCallSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("Laptop Pro")).not.toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when product fetch API returns 500", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    server.use(
      http.get(
        "*/api/v1/product/get-product",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderProductsPage();

    const toastMsg = await screen.findByText("Something Went Wrong");
    expect(toastMsg).toBeInTheDocument();

    expect(screen.getByText("All Products List")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when API returns success:false with HTTP 200", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/product/get-product", () =>
        HttpResponse.json({ success: false, message: "DB error" }),
      ),
    );

    renderProductsPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(screen.queryByText("Laptop Pro")).not.toBeInTheDocument();

    const errorToast = await screen.findByText("DB error");
    expect(errorToast).toBeInTheDocument();
  });
});
