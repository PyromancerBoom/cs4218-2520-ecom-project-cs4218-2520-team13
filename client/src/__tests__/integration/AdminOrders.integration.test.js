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
import AdminOrders from "../../pages/admin/AdminOrders";
import { AuthProvider } from "../../context/auth";

// Priyansh Bimbisariye, A0265903B

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));
jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

jest.mock("../../components/Layout", () => {
  const React = require("react");
  return function MockLayout({ children, title }) {
    return React.createElement(
      "div",
      { "data-testid": "layout" },
      React.createElement("h1", null, title),
      children,
    );
  };
});

jest.mock("../../components/AdminMenu", () => {
  const React = require("react");
  return function MockAdminMenu() {
    return React.createElement(
      "div",
      { "data-testid": "admin-menu" },
      "Admin Menu",
    );
  };
});

jest.mock("antd", () => {
  const React = require("react");
  const MockSelect = ({ children, onChange, defaultValue }) => {
    return React.createElement(
      "select",
      {
        "data-testid": "status-select",
        onChange: (e) => onChange(e.target.value),
        defaultValue: defaultValue,
      },
      children,
    );
  };
  MockSelect.Option = ({ children, value }) => {
    return React.createElement("option", { value }, children);
  };
  return { Select: MockSelect };
});

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

const mockOrders = [
  {
    _id: "order1",
    status: "Not Processed",
    buyer: { name: "Alice" },
    createdAt: "2024-06-01T00:00:00.000Z",
    payment: { success: true },
    products: [
      {
        _id: "p1",
        name: "Laptop",
        description: "A powerful laptop for developers",
        price: 1200,
      },
    ],
  },
  {
    _id: "order2",
    status: "Processing",
    buyer: { name: "Bob" },
    createdAt: "2024-06-02T00:00:00.000Z",
    payment: { success: false },
    products: [
      {
        _id: "p2",
        name: "Mouse",
        description: "Wireless ergonomic mouse",
        price: 50,
      },
      {
        _id: "p3",
        name: "Keyboard",
        description: "Mechanical keyboard with RGB",
        price: 150,
      },
    ],
  },
];

const renderAdminOrdersPage = () => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/admin/orders"]}>
        <Routes>
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
};

// Priyansh Bimbisariye, A0265903B
describe("AdminOrders integration tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should load and display orders when admin is authenticated", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let capturedAuthHeader = null;

    server.use(
      http.get("*/api/v1/auth/all-orders", ({ request }) => {
        capturedAuthHeader = request.headers.get("Authorization");
        return HttpResponse.json(mockOrders);
      }),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Verify AuthProvider set the axios Authorization header
    expect(capturedAuthHeader).toBe("admin-token");

    // Buyer names
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // Product names
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();

    // Payment statuses
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();

    // Product prices
    expect(screen.getByText("Price : 1200")).toBeInTheDocument();
    expect(screen.getByText("Price : 50")).toBeInTheDocument();

    const truncatedDescription = mockOrders[0].products[0].description.slice(
      0,
      30,
    );
    expect(screen.getByText(truncatedDescription)).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1",
    );
    expect(images[1]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p2",
    );
    expect(images[2]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p3",
    );

    // order numbering
    const rows = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"));
    expect(rows[0]).toHaveTextContent("1");
    expect(rows[1]).toHaveTextContent("2");
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should update backend correctly and refresh the list when the admin changes the order status", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let putRequestBody = null;
    let putRequestUrl = null;
    let getCallCount = 0;

    const updatedOrders = mockOrders.map((o) =>
      o._id === "order1" ? { ...o, status: "Shipped" } : o,
    );

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        getCallCount++;
        if (getCallCount >= 2) {
          return HttpResponse.json(updatedOrders);
        }
        return HttpResponse.json(mockOrders);
      }),
      http.put(
        "*/api/v1/auth/order-status/:orderId",
        async ({ request, params }) => {
          putRequestUrl = params.orderId;
          putRequestBody = await request.json();
          return HttpResponse.json({ success: true });
        },
      ),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(getCallCount).toBe(1);

    const selects = screen.getAllByTestId("status-select");

    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "Shipped" } });
    });

    await waitFor(() => {
      expect(putRequestUrl).toBe("order1");
      expect(putRequestBody).toEqual({ status: "Shipped" });
    });

    await waitFor(() => {
      expect(getCallCount).toBe(2);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  // note: AdminOrders itself does not show an unauthorized msg
  // it just skips calling getOrders when no token
  it("should not fetch orders and display no order data when user is unauthenticated", async () => {
    const getOrdersSpy = jest.fn();

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        getOrdersSpy();
        return HttpResponse.json([]);
      }),
    );

    renderAdminOrdersPage();
    expect(screen.getByText("All Orders")).toBeInTheDocument();

    await act(async () => {});

    expect(getOrdersSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should not crash when backend fails fetching orders", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    // cpmnt should render without crashing still
    expect(screen.getByText("All Orders")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should preserve existing orders when PUT order-status returns 500", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        return HttpResponse.json(mockOrders);
      }),
      http.put("*/api/v1/auth/order-status/:orderId", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    const selects = screen.getAllByTestId("status-select");

    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "Shipped" } });
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    // existing data should still be visible
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should render all products across multiple orders", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const multiOrders = [
      {
        _id: "o1",
        status: "Not Processed",
        buyer: { name: "Buyer One" },
        createdAt: "2024-06-01T00:00:00.000Z",
        payment: { success: true },
        products: [
          { _id: "pa", name: "Product A", description: "Desc A", price: 10 },
        ],
      },
      {
        _id: "o2",
        status: "Processing",
        buyer: { name: "Buyer Two" },
        createdAt: "2024-06-02T00:00:00.000Z",
        payment: { success: true },
        products: [
          { _id: "pb", name: "Product B", description: "Desc B", price: 20 },
          { _id: "pc", name: "Product C", description: "Desc C", price: 30 },
        ],
      },
      {
        _id: "o3",
        status: "Shipped",
        buyer: { name: "Buyer Three" },
        createdAt: "2024-06-03T00:00:00.000Z",
        payment: { success: false },
        products: [
          { _id: "pd", name: "Product D", description: "Desc D", price: 40 },
          { _id: "pe", name: "Product E", description: "Desc E", price: 50 },
          { _id: "pf", name: "Product F", description: "Desc F", price: 60 },
        ],
      },
    ];

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        return HttpResponse.json(multiOrders);
      }),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Buyer One")).toBeInTheDocument();
    });

    expect(screen.getByText("Buyer Two")).toBeInTheDocument();
    expect(screen.getByText("Buyer Three")).toBeInTheDocument();

    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
    expect(screen.getByText("Product C")).toBeInTheDocument();
    expect(screen.getByText("Product D")).toBeInTheDocument();
    expect(screen.getByText("Product E")).toBeInTheDocument();
    expect(screen.getByText("Product F")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should render order header without crashing when products array is empty", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const orderWithEmptyProducts = [
      {
        _id: "o-empty",
        status: "Not Processed",
        buyer: { name: "Empty Buyer" },
        createdAt: "2024-06-01T00:00:00.000Z",
        payment: { success: true },
        products: [],
      },
    ];

    server.use(
      http.get("*/api/v1/auth/all-orders", () => {
        return HttpResponse.json(orderWithEmptyProducts);
      }),
    );

    renderAdminOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Empty Buyer")).toBeInTheDocument();
    });

    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByTestId("status-select")).toBeInTheDocument();

    const bodyRow = screen
      .getAllByRole("row")
      .filter((row) => row.closest("tbody"))[0];
    expect(bodyRow).toHaveTextContent("0");

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
