// Priyansh Bimbisariye, A0265903B
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UpdateProduct from "./UpdateProduct";

// Mock dependencies
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: () => [{ token: "test-token" }, jest.fn()],
}));

jest.mock("../../context/cart", () => ({
  useCart: () => [[], jest.fn()],
}));

jest.mock("../../context/search", () => ({
  useSearch: () => [{ keyword: "" }, jest.fn()],
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">
    {title}
    {children}
  </div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, placeholder, value }) => (
    <select
      data-testid="ant-select"
      onChange={(e) => onChange(e.target.value)}
      value={value || ""}
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { Select };
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockProduct = {
  _id: "prod-123",
  name: "Test Product",
  description: "A test product",
  price: 100,
  quantity: 10,
  shipping: true,
  category: { _id: "cat-1", name: "Cat One" },
  slug: "test-product",
};

const mockCategories = [
  { _id: "cat-1", name: "Cat One" },
  { _id: "cat-2", name: "Cat Two" },
];

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/admin/product/test-product"]}>
      <Routes>
        <Route
          path="/dashboard/admin/product/:slug"
          element={<UpdateProduct />}
        />
      </Routes>
    </MemoryRouter>,
  );

const waitForProductLoad = async () => {
  await waitFor(() => {
    expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
  });
};

// Priyansh Bimbisariye, A0265903B
describe("UpdateProduct Component", () => {
  let mockAppend;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});

    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

    mockAppend = jest.fn();
    jest
      .spyOn(global.FormData.prototype, "append")
      .mockImplementation(mockAppend);

    axios.get.mockImplementation((url) => {
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({
          data: { product: mockProduct },
        });
      }
      if (url.includes("/api/v1/category/get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("Rendering and Initial Data Loading", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should show error toast when product or category fetch fails", async () => {
      // arrange
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
          return Promise.reject(new Error("Product not found"));
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // act
      renderComponent();

      // assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });

      // arrange
      jest.clearAllMocks();
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/get-product/")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("/api/v1/category/get-category")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      // act
      renderComponent();

      // assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something went wrong in getting category",
        );
      });
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("Form Input Handling", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should update text inputs and category dropdown on user interaction", async () => {
      // arrange
      renderComponent();
      await waitForProductLoad();
      const nameInput = screen.getByPlaceholderText("Write a name");
      const descInput = screen.getByPlaceholderText("Write a description");
      const categorySelect = screen.getByLabelText("Select a category");

      // act
      fireEvent.change(nameInput, { target: { value: "Updated Product" } });
      fireEvent.change(descInput, { target: { value: "Updated description" } });
      fireEvent.change(categorySelect, { target: { value: "cat-2" } });

      // assert
      expect(nameInput.value).toBe("Updated Product");
      expect(descInput.value).toBe("Updated description");
      expect(categorySelect.value).toBe("cat-2");
    });

    // Priyansh Bimbisariye, A0265903B
    it("should only accept positive numbers for price and quantity", async () => {
      // arrange
      renderComponent();
      await waitForProductLoad();
      const priceInput = screen.getByPlaceholderText("Write a price");
      const qtyInput = screen.getByPlaceholderText("Write a quantity");

      // act, assert , negative values rejected
      fireEvent.change(priceInput, { target: { value: "-1" } });
      fireEvent.change(qtyInput, { target: { value: "-1" } });
      expect(priceInput.value).toBe("");
      expect(qtyInput.value).toBe("");

      // act, assert , zero: price accepts, quantity rejects
      fireEvent.change(priceInput, { target: { value: "0" } });
      fireEvent.change(qtyInput, { target: { value: "0" } });
      expect(priceInput.value).toBe("0");
      expect(qtyInput.value).toBe("");

      // act, assert , positive and large values accepted
      fireEvent.change(priceInput, { target: { value: "999999999" } });
      fireEvent.change(qtyInput, { target: { value: "5" } });
      expect(priceInput.value).toBe("999999999");
      expect(qtyInput.value).toBe("5");
    });

    // Priyansh Bimbisariye, A0265903B
    it("should correctly reflect shipping value '0' when user selects No", async () => {
      // arrange
      renderComponent();
      await waitForProductLoad();
      const shippingSelect = screen.getByLabelText("Select Shipping");

      // act
      fireEvent.change(shippingSelect, { target: { value: "0" } });

      // assert
      expect(shippingSelect.value).toBe("0");
    });

    // Priyansh Bimbisariye, A0265903B
    it("should display uploaded photo preview and filename after selection", async () => {
      // arrange
      renderComponent();
      await waitForProductLoad();
      const file = new File(["photo"], "product-image.jpg", {
        type: "image/jpeg",
      });

      // act
      const photoInput = document.querySelector('input[type="file"]');
      fireEvent.change(photoInput, { target: { files: [file] } });

      // assert
      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
        const img = screen.getByAltText("product_photo");
        expect(img).toHaveAttribute("src", "blob:mock-url");
        expect(screen.getByText("product-image.jpg")).toBeInTheDocument();
        expect(screen.queryByText("Upload Photo")).not.toBeInTheDocument();
      });
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("Update Product Logic", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should send FormData with all fields including photo, show success toast, and navigate", async () => {
      // arrange
      axios.put.mockResolvedValue({
        data: { success: true, message: "Product Updated Successfully" },
      });
      renderComponent();
      await waitForProductLoad();

      fireEvent.change(screen.getByPlaceholderText("Write a name"), {
        target: { value: "Updated Name" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a description"), {
        target: { value: "Updated Desc" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a price"), {
        target: { value: "200" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a quantity"), {
        target: { value: "20" },
      });
      const file = new File(["img"], "new-photo.jpg", { type: "image/jpeg" });
      const photoInput = document.querySelector('input[type="file"]');
      fireEvent.change(photoInput, { target: { files: [file] } });

      // act
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/prod-123",
          expect.any(FormData),
        );
        expect(mockAppend).toHaveBeenCalledWith("name", "Updated Name");
        expect(mockAppend).toHaveBeenCalledWith("description", "Updated Desc");
        expect(mockAppend).toHaveBeenCalledWith("price", "200");
        expect(mockAppend).toHaveBeenCalledWith("quantity", "20");
        expect(mockAppend).toHaveBeenCalledWith("category", "cat-1");
        expect(mockAppend).toHaveBeenCalledWith("photo", file);
        expect(toast.success).toHaveBeenCalledWith(
          "Product Updated Successfully",
        );
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });

    // Priyansh Bimbisariye, A0265903B
    it("should show error toast on update failure or exception and not navigate", async () => {
      // arrange
      axios.put.mockResolvedValue({
        data: { success: false, message: "Update failed" },
      });
      renderComponent();
      await waitForProductLoad();

      // act
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      // arrange
      jest.clearAllMocks();
      axios.put.mockRejectedValue(new Error("Network Error"));

      // act
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
    });

    // Priyansh Bimbisariye, A0265903B
    it("should append shipping to FormData when updating a product", async () => {
      // arrange
      axios.put.mockResolvedValue({
        data: { success: true, message: "Product Updated Successfully" },
      });
      renderComponent();
      await waitForProductLoad();

      const shippingSelect = screen.getByLabelText("Select Shipping");
      fireEvent.change(shippingSelect, { target: { value: "1" } });

      // act
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(mockAppend).toHaveBeenCalledWith("shipping", "1");
      });
    });

    // Priyansh Bimbisariye, A0265903B
    it("should not allow update with empty required fields", async () => {
      // arrange
      renderComponent();
      await waitForProductLoad();

      // clear all fields
      fireEvent.change(screen.getByPlaceholderText("Write a name"), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a description"), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a price"), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write a quantity"), {
        target: { value: "" },
      });

      // act
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(axios.put).not.toHaveBeenCalled();
      });
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("Delete Product Logic", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should delete product, show success toast, and navigate when user confirms", async () => {
      // arrange
      window.confirm = jest.fn().mockReturnValue(true);
      axios.delete.mockResolvedValue({ data: { success: true } });
      renderComponent();
      await waitForProductLoad();

      // act
      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          "Are you sure you want to delete this product?",
        );
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/product/delete-product/prod-123",
        );
        expect(toast.success).toHaveBeenCalledWith(
          "Product Deleted Successfully",
        );
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });

    // Priyansh Bimbisariye, A0265903B
    it("should not delete product when user cancels", async () => {
      // arrange
      window.confirm = jest.fn().mockReturnValue(false);
      renderComponent();
      await waitForProductLoad();

      // act
      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      // assert
      expect(axios.delete).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // Priyansh Bimbisariye, A0265903B
    it("should show error toast when delete API throws an exception", async () => {
      // arrange
      window.confirm = jest.fn().mockReturnValue(true);
      axios.delete.mockRejectedValue(new Error("Server Error"));
      renderComponent();
      await waitForProductLoad();

      // act
      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      // assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
