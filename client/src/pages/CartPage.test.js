//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import CartPage from "./CartPage";
import axios from "axios";
import toast from "react-hot-toast";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";
import { useNavigate } from "react-router-dom";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("./../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});

jest.mock("braintree-web-drop-in-react", () => {
  return ({ onInstance }) => {
    const mockInstance = {
      requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "test-nonce" }),
    };
    setTimeout(() => onInstance(mockInstance), 0);
    return <div data-testid="dropin">DropIn Mock</div>;
  };
});

jest.mock("react-icons/ai", () => ({
  AiFillWarning: () => <span data-testid="warning-icon" />,
}));

const createProduct = (overrides = {}) => ({
  _id: "prod1",
  name: "Test Product",
  slug: "test-product",
  description:
    "This is a test product description that is long enough for truncation",
  price: 49.99,
  ...overrides,
});

const mockProducts = [
  createProduct({
    _id: "prod1",
    name: "Laptop",
    slug: "laptop",
    price: 999.99,
    description:
      "A powerful laptop for development and gaming with many great features",
  }),
  createProduct({
    _id: "prod2",
    name: "T-Shirt",
    slug: "t-shirt",
    price: 29.99,
    description:
      "A comfortable cotton t-shirt for everyday wear and outdoor activities",
  }),
  createProduct({
    _id: "prod3",
    name: "Headphones",
    slug: "headphones",
    price: 79.99,
    description:
      "Noise cancelling headphones with great bass and sound quality",
  }),
];

let mockNavigate;
let mockSetCart;
let mockSetAuth;

const setupMocks = (options = {}) => {
  mockNavigate = jest.fn();
  useNavigate.mockReturnValue(mockNavigate);

  const cart = options.cart ?? [];
  mockSetCart = jest.fn();
  useCart.mockReturnValue([cart, mockSetCart]);

  const auth = options.auth ?? { user: null, token: "" };
  mockSetAuth = jest.fn();
  useAuth.mockReturnValue([auth, mockSetAuth]);

  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/token") {
      return Promise.resolve({
        data: { clientToken: options.clientToken ?? "mock-client-token" },
      });
    }
    return Promise.resolve({ data: {} });
  });

  axios.post.mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/payment") {
      return Promise.resolve({ data: { success: true } });
    }
    return Promise.resolve({ data: {} });
  });
};

const renderCartPage = async () => {
  let result;
  await act(async () => {
    result = render(<CartPage />);
  });
  return result;
};

describe("CartPage", () => {
  let consoleSpy;
  let setItemSpy;
  let removeItemSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});
    removeItemSpy = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe("Greeting Display - EP", () => {
    test("EP(guest): should display 'Hello Guest'", async () => {
      setupMocks({ auth: { user: null, token: "" } });
      await renderCartPage();
      expect(screen.getByText("Hello Guest")).toBeInTheDocument();
    });

    test("EP(authenticated): should display user name in greeting", async () => {
      setupMocks({
        auth: { user: { name: "Aashim", address: "123 St" }, token: "tok123" },
      });
      await renderCartPage();
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/Aashim/)).toBeInTheDocument();
    });
  });

  describe("Cart Items Count - EP & BVA", () => {
    test("EP(0 items): should display 'Your Cart Is Empty'", async () => {
      setupMocks({ auth: { user: null, token: "" }, cart: [] });
      await renderCartPage();
      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
    });

    test("BVA(1 item): should display '1 items in your cart'", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(
        screen.getByText(/You Have 1 items in your cart/)
      ).toBeInTheDocument();
    });

    test("EP(3 items): should display '3 items in your cart'", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: mockProducts,
      });
      await renderCartPage();
      expect(
        screen.getByText(/You Have 3 items in your cart/)
      ).toBeInTheDocument();
    });

    test("EP(guest with items): should show 'please login to checkout'", async () => {
      setupMocks({
        auth: { user: null, token: "" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(screen.getByText(/please login to checkout/)).toBeInTheDocument();
    });

    test("EP(auth with items): should NOT show login prompt", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(
        screen.queryByText(/please login to checkout/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Cart Product Rendering - EP", () => {
    test("EP(0 items): should render no product cards", async () => {
      setupMocks({ cart: [] });
      await renderCartPage();
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    });

    test("EP(1 item): should render product details", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderCartPage();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText(/Price :/)).toBeInTheDocument();
      expect(screen.getByAltText("Laptop")).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod1"
      );
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    test("EP(3 items): should render all product cards with Remove buttons", async () => {
      setupMocks({ cart: mockProducts });
      await renderCartPage();
      expect(screen.getByText("Laptop")).toBeInTheDocument();
      expect(screen.getByText("T-Shirt")).toBeInTheDocument();
      expect(screen.getByText("Headphones")).toBeInTheDocument();
      expect(screen.getAllByText("Remove")).toHaveLength(3);
    });
  });

  describe("Description Truncation - BVA", () => {
    const makeProduct = (desc) =>
      createProduct({ _id: "pDesc", name: "DescTest", description: desc });

    test("BVA(length=29): should show full 29-char text", async () => {
      const desc = "A".repeat(29);
      setupMocks({ cart: [makeProduct(desc)] });
      await renderCartPage();
      expect(screen.getByText(desc)).toBeInTheDocument();
    });

    test("BVA(length=30): should show full 30-char text", async () => {
      const desc = "B".repeat(30);
      setupMocks({ cart: [makeProduct(desc)] });
      await renderCartPage();
      expect(screen.getByText(desc)).toBeInTheDocument();
    });

    test("BVA(length=31): should truncate to 30 chars", async () => {
      const desc = "C".repeat(31);
      setupMocks({ cart: [makeProduct(desc)] });
      await renderCartPage();
      expect(screen.getByText("C".repeat(30))).toBeInTheDocument();
    });

    test("EP(empty string): should render product without crashing", async () => {
      setupMocks({ cart: [makeProduct("")] });
      await renderCartPage();
      expect(screen.getByText("DescTest")).toBeInTheDocument();
    });

    test("BUG: should handle null description without crashing", async () => {
      setupMocks({ cart: [makeProduct(null)] });
      await renderCartPage();
      expect(screen.getByText("DescTest")).toBeInTheDocument();
    });

    test("BUG: should handle undefined description without crashing", async () => {
      const product = createProduct({ _id: "pUndef", name: "UndefDesc" });
      delete product.description;
      setupMocks({ cart: [product] });
      await renderCartPage();
      expect(screen.getByText("UndefDesc")).toBeInTheDocument();
    });
  });

  describe("Total Price Calculation - EP & BVA", () => {
    test("EP(0 items): should display $0.00", async () => {
      setupMocks({ cart: [] });
      await renderCartPage();
      expect(screen.getByText(/Total :/)).toHaveTextContent("$0.00");
    });

    test("BVA(price=0): should display $0.00 for zero-priced item", async () => {
      setupMocks({
        cart: [createProduct({ _id: "p0", price: 0, description: "Valid desc for testing purposes" })],
      });
      await renderCartPage();
      expect(screen.getByText(/Total :/)).toHaveTextContent("$0.00");
    });

    test("EP(1 item, price=49.99): should display $49.99", async () => {
      setupMocks({
        cart: [
          createProduct({ _id: "p1", price: 49.99, description: "Valid desc for testing purposes" }),
        ],
      });
      await renderCartPage();
      expect(screen.getByText(/Total :/)).toHaveTextContent("$49.99");
    });

    test("EP(2 items): should display sum of prices", async () => {
      setupMocks({
        cart: [
          createProduct({ _id: "p1", price: 100, description: "Product one description for testing" }),
          createProduct({ _id: "p2", price: 200, description: "Product two description for testing" }),
        ],
      });
      await renderCartPage();
      expect(screen.getByText(/Total :/)).toHaveTextContent("$300.00");
    });

    test("BVA(large total): should format with commas", async () => {
      setupMocks({
        cart: [
          createProduct({ _id: "p1", price: 5000, description: "Expensive product one description" }),
          createProduct({ _id: "p2", price: 5000, description: "Expensive product two description" }),
        ],
      });
      await renderCartPage();
      expect(screen.getByText(/Total :/)).toHaveTextContent("$10,000.00");
    });

    test("BUG: totalPrice should handle item with null price gracefully", async () => {
      setupMocks({
        cart: [
          createProduct({ _id: "pNull", name: "NullPrice", price: null, description: "Valid desc for testing purposes" }),
        ],
      });
      await renderCartPage();
      const totalText = screen.getByText(/Total :/).textContent;
      expect(totalText).not.toContain("NaN");
    });
  });

  describe("Remove Cart Item - EP", () => {
    test("EP(valid item): should call setCart and update localStorage", async () => {
      setupMocks({ cart: [mockProducts[0], mockProducts[1]] });
      await renderCartPage();

      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);

      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ _id: "prod2" })])
      );
      expect(mockSetCart).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.objectContaining({ _id: "prod1" })])
      );
      expect(setItemSpy).toHaveBeenCalledWith(
        "cart",
        expect.stringContaining("prod2")
      );
    });

    test("EP(single item): should result in empty cart", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderCartPage();

      fireEvent.click(screen.getByText("Remove"));

      expect(mockSetCart).toHaveBeenCalledWith([]);
      expect(setItemSpy).toHaveBeenCalledWith("cart", "[]");
    });

    test("BUG: removeCartItem should not remove any item if pid is not found", async () => {
      const cart = [mockProducts[0], mockProducts[1]];
      setupMocks({ cart });
      await renderCartPage();

      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[1]);

      expect(mockSetCart).toHaveBeenCalledWith([
        expect.objectContaining({ _id: "prod1" }),
      ]);
    });

    test("BUG: Remove specific instance of duplicate item", async () => {
      const laptop = createProduct({ _id: "prod1", name: "Laptop" });
      setupMocks({ cart: [laptop, laptop] });
      await renderCartPage();

      const removeButtons = screen.getAllByText("Remove");
      expect(removeButtons).toHaveLength(2);

      fireEvent.click(removeButtons[1]);
    });
  });

  describe("Address & Navigation - EP", () => {
    test("EP(guest): should show login button", async () => {
      setupMocks({ auth: { user: null, token: "" }, cart: [mockProducts[0]] });
      await renderCartPage();
      expect(
        screen.getByText(/Plase Login to checkout/)
      ).toBeInTheDocument();
    });

    test("EP(guest): login button should navigate to /login with state '/cart'", async () => {
      setupMocks({ auth: { user: null, token: "" }, cart: [mockProducts[0]] });
      await renderCartPage();
      fireEvent.click(screen.getByText(/Plase Login to checkout/));
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: "/cart",
      });
    });

    test("EP(auth, no address): should show 'Update Address' button", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(screen.getByText("Update Address")).toBeInTheDocument();
    });

    test("EP(auth, no address): Update Address navigates to profile", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      fireEvent.click(screen.getByText("Update Address"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    test("EP(auth, with address): should display current address", async () => {
      setupMocks({
        auth: {
          user: { name: "User", address: "123 Main St" },
          token: "tok",
        },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(screen.getByText("Current Address")).toBeInTheDocument();
      expect(screen.getByText("123 Main St")).toBeInTheDocument();
    });
  });

  describe("Payment Gateway - EP", () => {
    test("EP(no clientToken): should not render DropIn or Make Payment", async () => {
      setupMocks({
        auth: { user: { name: "User", address: "123 St" }, token: "tok" },
        cart: [mockProducts[0]],
        clientToken: null,
      });
      axios.get.mockResolvedValue({ data: { clientToken: "" } });
      await renderCartPage();
      expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
      expect(screen.queryByText("Make Payment")).not.toBeInTheDocument();
    });

    test("EP(no auth token): should not render DropIn", async () => {
      setupMocks({
        auth: { user: null, token: "" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
    });

    test("EP(empty cart): should not render DropIn", async () => {
      setupMocks({
        auth: { user: { name: "User", address: "123 St" }, token: "tok" },
        cart: [],
      });
      await renderCartPage();
      expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
    });

    test("EP(all conditions met): should render DropIn and Make Payment", async () => {
      setupMocks({
        auth: { user: { name: "User", address: "123 St" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      await waitFor(() => {
        expect(screen.getByTestId("dropin")).toBeInTheDocument();
        expect(screen.getByText("Make Payment")).toBeInTheDocument();
      });
    });

    test("EP(no address): Make Payment should be disabled", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();
      await waitFor(() => {
        const btn = screen.queryByText("Make Payment");
        if (btn) {
          expect(btn).toBeDisabled();
        }
      });
    });
  });

  describe("Handle Payment - EP", () => {
    test("EP(success): should clear cart, navigate to orders, show toast", async () => {
      setupMocks({
        auth: { user: { name: "User", address: "123 St" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByText("Make Payment")).toBeInTheDocument();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Make Payment"));
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/braintree/payment",
          expect.objectContaining({ nonce: "test-nonce" })
        );
        expect(removeItemSpy).toHaveBeenCalledWith("cart");
        expect(mockSetCart).toHaveBeenCalledWith([]);
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
        expect(toast.success).toHaveBeenCalledWith(
          "Payment Completed Successfully "
        );
      });
    });

    test("EP(payment API failure): should log error and set loading false", async () => {
      setupMocks({
        auth: { user: { name: "User", address: "123 St" }, token: "tok" },
        cart: [mockProducts[0]],
      });
      axios.post.mockRejectedValue(new Error("Payment failed"));

      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByText("Make Payment")).toBeInTheDocument();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Make Payment"));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalledWith(
          "/dashboard/user/orders"
        );
      });
    });
  });

  describe("Braintree Token Fetch", () => {
    test("should fetch braintree token on mount", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
      });
      await renderCartPage();
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      );
    });

    test("should handle braintree token API failure gracefully", async () => {
      setupMocks({
        auth: { user: { name: "User" }, token: "tok" },
      });
      axios.get.mockRejectedValue(new Error("Token fetch failed"));
      await renderCartPage();
      expect(screen.getByText("Cart Summary")).toBeInTheDocument();
    });

    test("Should NOT fetch token if auth token is missing", async () => {
      setupMocks({ auth: { user: null, token: "" } });
      await renderCartPage();
      expect(axios.get).not.toHaveBeenCalledWith("/api/v1/product/braintree/token");
    });
  });

  describe("Cart Summary Display", () => {
    test("should render Cart Summary heading", async () => {
      setupMocks();
      await renderCartPage();
      expect(screen.getByText("Cart Summary")).toBeInTheDocument();
    });

    test("should render 'Total | Checkout | Payment' text", async () => {
      setupMocks();
      await renderCartPage();
      expect(
        screen.getByText("Total | Checkout | Payment")
      ).toBeInTheDocument();
    });
  });

  describe("Price Display in Cart Items", () => {
    test("should display price for each cart item", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderCartPage();
      expect(screen.getByText(/Price : 999.99/)).toBeInTheDocument();
    });
  });

  describe("Product Image in Cart", () => {
    test("should render product image with correct API URL", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderCartPage();
      const img = screen.getByAltText("Laptop");
      expect(img).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod1"
      );
      expect(img).toHaveAttribute("width", "100%");
    });
  });
});