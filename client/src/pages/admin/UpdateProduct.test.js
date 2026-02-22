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

jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => <div>AdminMenu</div>);

jest.mock("antd", () => {
  const Select = ({
    children,
    onChange,
    value,
    bordered,
    showSearch,
    size,
    ...props
  }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {children}
    </select>
  );
  Select.Option = ({ children, value }) => (
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

// Priyansh Bimbisariye, A0265903B
describe("UpdateProduct Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
  it("should populate form fields with fetched product data on mount", async () => {
    // arrange and act
    renderComponent();

    // assert
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
      expect(screen.getByDisplayValue("A test product")).toBeInTheDocument();
      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show success toast when product is updated successfully", async () => {
    // arrange
    axios.put.mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // assert
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Product Updated Successfully",
      );
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when product update fails", async () => {
    // arrange
    axios.put.mockResolvedValue({
      data: { success: false, message: "Update failed" },
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when update API throws an exception", async () => {
    // arrange
    axios.put.mockRejectedValue(new Error("Network Error"));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should delete product and navigate to products page when confirmed", async () => {
    // arrange
    window.prompt = jest.fn().mockReturnValue("Yes");
    axios.delete.mockResolvedValue({ data: { success: true } });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    // assert
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/prod-123",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should not delete product when prompt is cancelled", async () => {
    // arrange
    window.prompt = jest.fn().mockReturnValue(null);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    // assert
    expect(axios.delete).not.toHaveBeenCalled();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should display uploaded photo preview when a new photo is selected", async () => {
    // arrange
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    global.URL.createObjectURL = jest.fn(() => "blob:photo-url");

    // act
    const photoInput = document.querySelector('input[type="file"]');
    fireEvent.change(photoInput, { target: { files: [file] } });

    // assert
    await waitFor(() => {
      const img = screen.getByAltText("product_photo");
      expect(img).toBeInTheDocument();
      expect(img.src).toContain("blob:photo-url");
    });
  });

  // Priyansh Bimbisariye, A0265903B
  it("should navigate to products page after successful update", async () => {
    // arrange
    axios.put.mockResolvedValue({
      data: { success: true, message: "Product Updated Successfully" },
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    });

    // act
    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    // assert
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });
});
