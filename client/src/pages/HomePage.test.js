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
import HomePage from "./HomePage";
import axios from "axios";
import toast from "react-hot-toast";
import { useCart } from "../context/cart";
import { useNavigate } from "react-router-dom";
import { Prices } from "../components/Prices";

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

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("./../components/Layout", () => {
  return ({ children, title }) => (
    <div data-testid="layout" data-title={title}>
      {children}
    </div>
  );
});

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span data-testid="reload-icon" />,
}));

jest.mock("antd", () => {
  const Checkbox = ({ children, onChange }) => (
    <label>
      <input type="checkbox" onChange={onChange} />
      <span>{children}</span>
    </label>
  );

  const Radio = ({ children, value }) => (
    <label>
      <input
        type="radio"
        name="price-filter"
        value={JSON.stringify(value)}
      />
      <span>{children}</span>
    </label>
  );

  Radio.Group = ({ children, onChange }) => {
    const handleClick = (e) => {
      if (e.target.type === "radio") {
        try {
          onChange({ target: { value: JSON.parse(e.target.value) } });
        } catch {
          onChange({ target: { value: e.target.value } });
        }
      }
    };
    return (
      <div data-testid="radio-group" onClick={handleClick}>
        {children}
      </div>
    );
  };

  return { Checkbox, Radio };
});

const createProduct = (overrides = {}) => ({
  _id: "prod1",
  name: "Test Product",
  slug: "test-product",
  description:
    "This is a test product description that is long enough for truncation testing purposes",
  price: 49.99,
  ...overrides,
});

const mockCategories = [
  { _id: "cat1", name: "Electronics", slug: "electronics" },
  { _id: "cat2", name: "Clothing", slug: "clothing" },
  { _id: "cat3", name: "Books", slug: "books" },
];

const mockProducts = [
  createProduct({
    _id: "prod1",
    name: "Laptop",
    slug: "laptop",
    price: 999.99,
    description:
      "A powerful laptop for development and gaming with many great features and specs",
  }),
  createProduct({
    _id: "prod2",
    name: "T-Shirt",
    slug: "t-shirt",
    price: 29.99,
    description:
      "A comfortable cotton t-shirt for everyday wear and outdoor activities every day",
  }),
];

const mockPage2Products = [
  createProduct({
    _id: "prod3",
    name: "Headphones",
    slug: "headphones",
    price: 79.99,
    description:
      "Noise cancelling headphones with great bass and sound quality for music lovers",
  }),
];

let mockNavigate;
let mockSetCart;

const setupMocks = (options = {}) => {
  mockNavigate = jest.fn();
  useNavigate.mockReturnValue(mockNavigate);

  const cart = options.cart || [];
  mockSetCart = jest.fn();
  useCart.mockReturnValue([cart, mockSetCart]);

  const products = options.products ?? mockProducts;
  const categories = options.categories ?? mockCategories;
  const total = options.total ?? 6;
  const page2Products = options.page2Products ?? mockPage2Products;
  const filteredProducts = options.filteredProducts ?? [mockProducts[0]];

  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: { success: true, category: categories },
      });
    }
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({ data: { total } });
    }
    if (url.includes("/api/v1/product/product-list/")) {
      const pageNum = parseInt(url.split("/").pop());
      return Promise.resolve({
        data: { products: pageNum === 1 ? products : page2Products },
      });
    }
    return Promise.resolve({ data: {} });
  });

  axios.post.mockImplementation((url) => {
    if (url === "/api/v1/product/product-filters") {
      return Promise.resolve({ data: { products: filteredProducts } });
    }
    return Promise.resolve({ data: {} });
  });
};

const renderHomePage = async () => {
  let result;
  await act(async () => {
    result = render(<HomePage />);
  });
  return result;
};

describe("HomePage", () => {
  let consoleSpy;
  let setItemSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe("Initial Rendering & Data Loading", () => {
    test("should render Layout with correct title prop", async () => {
      setupMocks();
      await renderHomePage();
      expect(screen.getByTestId("layout")).toHaveAttribute(
        "data-title",
        "ALL Products - Best offers "
      );
    });

    test("should render banner image with correct src and alt", async () => {
      setupMocks();
      await renderHomePage();
      const banner = screen.getByAltText("bannerimage");
      expect(banner).toHaveAttribute("src", "/images/Virtual.png");
      expect(banner).toHaveAttribute("width", "100%");
    });

    test("should display filter and product headings", async () => {
      setupMocks();
      await renderHomePage();
      expect(screen.getByText("Filter By Category")).toBeInTheDocument();
      expect(screen.getByText("Filter By Price")).toBeInTheDocument();
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    test("should fetch categories, product count, and page 1 products on mount", async () => {
      setupMocks();
      await renderHomePage();
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/product/product-list/")
      );
    });

    test("should render RESET FILTERS button", async () => {
      setupMocks();
      await renderHomePage();
      expect(
        screen.getByRole("button", { name: /reset filters/i })
      ).toBeInTheDocument();
    });
  });

  describe("Category Rendering - EP", () => {
    test("EP(0 categories): should render no checkboxes when API returns empty", async () => {
      setupMocks({ categories: [] });
      await renderHomePage();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    });

    test("BVA(1 category): should render exactly one category checkbox", async () => {
      setupMocks({ categories: [mockCategories[0]] });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.queryByText("Clothing")).not.toBeInTheDocument();
      });
    });

    test("EP(3 categories): should render all category checkboxes", async () => {
      setupMocks();
      await renderHomePage();
      await waitFor(() => {
        mockCategories.forEach((c) => {
          expect(screen.getByText(c.name)).toBeInTheDocument();
        });
      });
    });

    test("should render all price filter radio options from Prices data", async () => {
      setupMocks();
      await renderHomePage();
      Prices.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
      });
    });
  });

  describe("Product Rendering - EP", () => {
    test("EP(0 products): should render no product cards", async () => {
      setupMocks({ products: [], total: 0 });
      await renderHomePage();
      expect(screen.queryByText("More Details")).not.toBeInTheDocument();
      expect(screen.queryByText("ADD TO CART")).not.toBeInTheDocument();
    });

    test("BVA(1 product): should render exactly one product card", async () => {
      setupMocks({ products: [mockProducts[0]], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getAllByText("More Details")).toHaveLength(1);
        expect(screen.getAllByText("ADD TO CART")).toHaveLength(1);
      });
    });

    test("EP(2 products): should render all product cards with buttons", async () => {
      setupMocks();
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("T-Shirt")).toBeInTheDocument();
        expect(screen.getAllByText("More Details")).toHaveLength(2);
        expect(screen.getAllByText("ADD TO CART")).toHaveLength(2);
      });
    });

    test("should render product image with API photo URL", async () => {
      setupMocks({ products: [mockProducts[0]], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        const img = screen.getByAltText("Laptop");
        expect(img).toHaveAttribute(
          "src",
          "/api/v1/product/product-photo/prod1"
        );
      });
    });
  });

  describe("Description Truncation - BVA", () => {
    const makeProduct = (desc) =>
      createProduct({
        _id: "pDesc",
        name: "DescTest",
        slug: "desc-test",
        description: desc,
      });

    test("BVA(length=59): should show full 59-char text with trailing '...'", async () => {
      const desc = "A".repeat(59);
      setupMocks({ products: [makeProduct(desc)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText(desc + "...")).toBeInTheDocument();
      });
    });

    test("BVA(length=60): should show full 60-char text with trailing '...'", async () => {
      const desc = "B".repeat(60);
      setupMocks({ products: [makeProduct(desc)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText(desc + "...")).toBeInTheDocument();
      });
    });

    test("BVA(length=61): should truncate to 60 chars with trailing '...'", async () => {
      const desc = "C".repeat(61);
      setupMocks({ products: [makeProduct(desc)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("C".repeat(60) + "...")).toBeInTheDocument();
      });
    });

    test("EP(empty string): should render product without crashing", async () => {
      setupMocks({ products: [makeProduct("")], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("DescTest")).toBeInTheDocument();
      });
    });

    test("BUG: should handle null description without crashing", async () => {
      setupMocks({ products: [makeProduct(null)], total: 1 });
      await renderHomePage();
      expect(screen.getByText("DescTest")).toBeInTheDocument();
    });

    test("BUG: should handle undefined description without crashing", async () => {
      const product = createProduct({
        _id: "pUndef",
        name: "UndefDesc",
        slug: "undef",
      });
      delete product.description;
      setupMocks({ products: [product], total: 1 });
      await renderHomePage();
      expect(screen.getByText("UndefDesc")).toBeInTheDocument();
    });
  });

  describe("Price Display - BVA", () => {
    const makeProduct = (price) =>
      createProduct({
        _id: "pPrice",
        name: "PriceTest",
        slug: "price-test",
        description: "A valid description for the product being tested here now",
        price,
      });

    test("BVA(price=0): should display $0.00", async () => {
      setupMocks({ products: [makeProduct(0)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("$0.00")).toBeInTheDocument();
      });
    });

    test("BVA(price=0.01): should display $0.01", async () => {
      setupMocks({ products: [makeProduct(0.01)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("$0.01")).toBeInTheDocument();
      });
    });

    test("EP(price=49.99): should display $49.99", async () => {
      setupMocks({ products: [makeProduct(49.99)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("$49.99")).toBeInTheDocument();
      });
    });

    test("BVA(price=9999.99): should display $9,999.99 with comma", async () => {
      setupMocks({ products: [makeProduct(9999.99)], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("$9,999.99")).toBeInTheDocument();
      });
    });

    test("BUG: should handle null price without crashing", async () => {
      setupMocks({ products: [makeProduct(null)], total: 1 });
      await renderHomePage();
      expect(screen.getByText("PriceTest")).toBeInTheDocument();
    });

    test("BUG: should handle undefined price without crashing", async () => {
      const product = createProduct({
        _id: "pUndefP",
        name: "UndefPrice",
        slug: "undef-price",
        description: "A valid description for testing undefined price edge",
      });
      delete product.price;
      setupMocks({ products: [product], total: 1 });
      await renderHomePage();
      expect(screen.getByText("UndefPrice")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    test("should navigate to /product/:slug on 'More Details' click", async () => {
      setupMocks({ products: [mockProducts[0]], total: 1 });
      await renderHomePage();
      await waitFor(() => {
        fireEvent.click(screen.getByText("More Details"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");
    });

    test("should navigate to correct slug for each product", async () => {
      setupMocks();
      await renderHomePage();
      const buttons = await screen.findAllByText("More Details");

      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/product/laptop");

      fireEvent.click(buttons[1]);
      expect(mockNavigate).toHaveBeenCalledWith("/product/t-shirt");
    });
  });

  describe("Add to Cart - EP", () => {
    test("EP(empty cart): should add product and show success toast", async () => {
      setupMocks({ cart: [] });
      await renderHomePage();
      const buttons = await screen.findAllByText("ADD TO CART");
      fireEvent.click(buttons[0]);

      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ _id: "prod1" })])
      );
      expect(setItemSpy).toHaveBeenCalledWith(
        "cart",
        expect.stringContaining("prod1")
      );
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    test("EP(existing cart, new item): should append new product to cart", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderHomePage();
      const buttons = await screen.findAllByText("ADD TO CART");
      fireEvent.click(buttons[1]);

      expect(mockSetCart).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _id: "prod1" }),
          expect.objectContaining({ _id: "prod2" }),
        ])
      );
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    test("BUG: should prevent adding duplicate product to cart", async () => {
      setupMocks({ cart: [mockProducts[0]] });
      await renderHomePage();
      const buttons = await screen.findAllByText("ADD TO CART");
      fireEvent.click(buttons[0]);

      expect(toast.error).toHaveBeenCalled();
      expect(mockSetCart).not.toHaveBeenCalled();
    });
  });

  describe("Pagination - BVA", () => {
    test("BVA(products < total): should show Loadmore button", async () => {
      setupMocks({ products: mockProducts, total: 6 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText(/loadmore/i)).toBeInTheDocument();
      });
    });

    test("BVA(products === total): should NOT show Loadmore button", async () => {
      setupMocks({ products: mockProducts, total: 2 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.queryByText(/loadmore/i)).not.toBeInTheDocument();
      });
    });

    test("BVA(products === total - 1): should show Loadmore button", async () => {
      setupMocks({ products: mockProducts, total: 3 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText(/loadmore/i)).toBeInTheDocument();
      });
    });

    test("BVA(products > total): should NOT show Loadmore button", async () => {
      setupMocks({ products: mockProducts, total: 1 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.queryByText(/loadmore/i)).not.toBeInTheDocument();
      });
    });

    test("BVA(0 products, total=0): should NOT show Loadmore button", async () => {
      setupMocks({ products: [], total: 0 });
      await renderHomePage();
      expect(screen.queryByText(/loadmore/i)).not.toBeInTheDocument();
    });

    test("should fetch page 2 when Loadmore is clicked once", async () => {
      setupMocks({ total: 6 });
      await renderHomePage();
      fireEvent.click(screen.getByText(/loadmore/i));
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/2"
        );
      });
    });

    test("should append page 2 products to existing list", async () => {
      setupMocks({ total: 6 });
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("T-Shirt")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/loadmore/i));
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("T-Shirt")).toBeInTheDocument();
        expect(screen.getByText("Headphones")).toBeInTheDocument();
      });
    });
  });

  describe("Category Filter", () => {
    test("should call filter API when a category checkbox is checked", async () => {
      setupMocks();
      await renderHomePage();
      const checkboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          expect.objectContaining({
            checked: expect.arrayContaining(["cat1"]),
          })
        );
      });
    });
  });

  describe("Price Filter", () => {
    test("should call filter API when a price radio is selected", async () => {
      setupMocks();
      await renderHomePage();

      const radios = screen.getAllByRole("radio");
      await act(async () => {
        fireEvent.click(radios[0]);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          expect.objectContaining({
            radio: [0, 19],
          })
        );
      });
    });
  });

  describe("Reset Filters", () => {
    test("BUG: RESET FILTERS should clear filter state without page reload", async () => {
      setupMocks();
      await renderHomePage();

      const checkboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          expect.anything()
        );
      });

      axios.get.mockClear();
      axios.post.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByText("RESET FILTERS"));
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/product/product-list/")
        );
      });
    });
  });

  describe("Filter Race Condition", () => {
    test("BUG: should NOT call getAllProducts when only category filter is active", async () => {
      setupMocks();
      await renderHomePage();

      axios.get.mockClear();

      const checkboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          expect.anything()
        );
      });

      const productListCalls = axios.get.mock.calls.filter((c) =>
        c[0].includes("/api/v1/product/product-list/")
      );
      expect(productListCalls).toHaveLength(0);
    });
  });

  describe("Load More with Active Filters", () => {
    test("BUG: should hide Loadmore button when filters are active", async () => {
      setupMocks({
        total: 6,
        filteredProducts: [mockProducts[0]],
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/loadmore/i)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      await waitFor(() => {
        expect(screen.queryByText(/loadmore/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("API Error Handling", () => {
    test("should handle category API failure gracefully", async () => {
      setupMocks();
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("Network Error"));
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 6 } });
        }
        if (url.includes("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    test("should handle product list API failure gracefully", async () => {
      setupMocks();
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 6 } });
        }
        if (url.includes("/api/v1/product/product-list/")) {
          return Promise.reject(new Error("Server Error"));
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    test("should handle product count API failure gracefully", async () => {
      setupMocks();
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.reject(new Error("Server Error"));
        }
        if (url.includes("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();
      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    test("should handle filter API failure gracefully", async () => {
      setupMocks();
      axios.post.mockRejectedValue(new Error("Filter Error"));

      await renderHomePage();
      const checkboxes = screen.getAllByRole("checkbox");
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(screen.getByText("All Products")).toBeInTheDocument();
    });

    test("should not render categories when API returns success=false", async () => {
      setupMocks();
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: false } });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 6 } });
        }
        if (url.includes("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: mockProducts } });
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    });
  });
});
