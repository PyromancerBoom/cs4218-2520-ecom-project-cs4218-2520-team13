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
import CreateCategory from "./CreateCategory";
import { AuthProvider } from "../../context/auth";

// Priyansh Bimbisariye, A0265903B

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
    return { matches: false, addListener() {}, removeListener() {} };
  };

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockCategories = [
  { _id: "cat-1", name: "Electronics" },
  { _id: "cat-2", name: "Clothing" },
  { _id: "cat-3", name: "Books" },
];

const renderCreateCategoryPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
        <Routes>
          <Route
            path="/dashboard/admin/create-category"
            element={<CreateCategory />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

// Priyansh Bimbisariye, A0265903B
describe("Admin CreateCategory page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should fetch and display all categories in the table", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/category/get-category", () =>
        HttpResponse.json({
          success: true,
          category: mockCategories,
        }),
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    expect(screen.getByText("Clothing")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = screen.getAllByText("Delete");
    expect(editButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });

  // Priyansh Bimbisariye, A0265903B
  it("should render page structure: Layout title, AdminMenu, Footer, and CategoryForm", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/category/get-category", () =>
        HttpResponse.json({ success: true, category: [] }),
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(document.title).toBe("Dashboard - Create Category"),
    );

    expect(screen.getByText("Manage Category")).toBeInTheDocument();

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();

    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter new category"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should create a new category and show success toast", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let getCallCount = 0;

    server.use(
      http.get("*/api/v1/category/get-category", () => {
        getCallCount++;
        if (getCallCount === 1) {
          return HttpResponse.json({
            success: true,
            category: mockCategories,
          });
        }
        return HttpResponse.json({
          success: true,
          category: [...mockCategories, { _id: "cat-4", name: "Toys" }],
        });
      }),
      http.post("*/api/v1/category/create-category", async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ name: "Toys" });
        return HttpResponse.json({
          success: true,
          message: "new category created",
          category: { _id: "cat-4", name: "Toys" },
        });
      }),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Toys" } });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const toastMsg = await screen.findByText("Toys is created");
    expect(toastMsg).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Toys")).toBeInTheDocument());
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show validation error toast when submitting empty name", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const postSpy = jest.fn();

    server.use(
      http.get("*/api/v1/category/get-category", () =>
        HttpResponse.json({ success: true, category: mockCategories }),
      ),
      http.post("*/api/v1/category/create-category", () => {
        postSpy();
        return HttpResponse.json({ success: true });
      }),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const errorToast = await screen.findByText("Category name is required");
    expect(errorToast).toBeInTheDocument();

    expect(postSpy).not.toHaveBeenCalled();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should update a category via edit modal and show success toast", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let getCallCount = 0;

    server.use(
      http.get("*/api/v1/category/get-category", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return HttpResponse.json({
            success: true,
            category: mockCategories,
          });
        }
        return HttpResponse.json({
          success: true,
          category: [
            { _id: "cat-1", name: "Updated Electronics" },
            { _id: "cat-2", name: "Clothing" },
            { _id: "cat-3", name: "Books" },
          ],
        });
      }),
      http.put(
        "*/api/v1/category/update-category/cat-1",
        async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ name: "Updated Electronics" });
          return HttpResponse.json({
            success: true,
            message: "Category Updated Successfully",
            category: { _id: "cat-1", name: "Updated Electronics" },
          });
        },
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]);

    const modalInput = await screen.findByDisplayValue("Electronics");
    expect(modalInput).toBeInTheDocument();

    fireEvent.change(modalInput, { target: { value: "Updated Electronics" } });

    const submitButtons = screen.getAllByRole("button", { name: "Submit" });

    fireEvent.click(submitButtons[submitButtons.length - 1]);

    const toastMsg = await screen.findByText("Updated Electronics is updated");
    expect(toastMsg).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Updated Electronics")).toBeInTheDocument(),
    );
  });

  // Priyansh Bimbisariye, A0265903B
  it("should delete a category, show success toast, and remove from table", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let getCallCount = 0;

    server.use(
      http.get("*/api/v1/category/get-category", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return HttpResponse.json({
            success: true,
            category: mockCategories,
          });
        }

        return HttpResponse.json({
          success: true,
          category: [
            { _id: "cat-2", name: "Clothing" },
            { _id: "cat-3", name: "Books" },
          ],
        });
      }),
      http.delete("*/api/v1/category/delete-category/cat-1", () =>
        HttpResponse.json({
          success: true,
          message: "Category Deleted Successfully",
        }),
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    const toastMsg = await screen.findByText("Category is deleted");
    expect(toastMsg).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Clothing")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when fetch API returns 500", async () => {
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
        "*/api/v1/category/get-category",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderCreateCategoryPage();

    const toastMsg = await screen.findByText(
      "Something went wrong in getting category",
    );
    expect(toastMsg).toBeInTheDocument();

    expect(screen.getByText("Manage Category")).toBeInTheDocument();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when creating a duplicate category", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    server.use(
      http.get("*/api/v1/category/get-category", () =>
        HttpResponse.json({ success: true, category: mockCategories }),
      ),
      http.post("*/api/v1/category/create-category", () =>
        HttpResponse.json({
          success: true,
          message: "Category Already Exists",
        }),
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );

    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Electronics" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const errorToast = await screen.findByText("Category Already Exists");
    expect(errorToast).toBeInTheDocument();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should not fetch categories when auth token is missing", async () => {
    const apiCallSpy = jest.fn();

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    server.use(
      http.get("*/api/v1/category/get-category", () => {
        apiCallSpy();
        return HttpResponse.json({ success: true, category: mockCategories });
      }),
    );

    renderCreateCategoryPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(apiCallSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should show error toast when API returns success:false", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    server.use(
      http.get("*/api/v1/category/get-category", () =>
        HttpResponse.json({
          success: false,
          message: "Database connection failed",
        }),
      ),
    );

    renderCreateCategoryPage();

    const errorToast = await screen.findByText("Database connection failed");
    expect(errorToast).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  // Priyansh Bimbisariye, A0265903B
  it("should complete full CRUD lifecycle: create → update → delete", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: { name: "Admin", role: 1 },
        token: "admin-token",
      }),
    );

    let getCallCount = 0;

    server.use(
      http.get("*/api/v1/category/get-category", () => {
        getCallCount++;
        if (getCallCount <= 1) {
          return HttpResponse.json({
            success: true,
            category: mockCategories,
          });
        }

        if (getCallCount === 2) {
          return HttpResponse.json({
            success: true,
            category: [...mockCategories, { _id: "cat-4", name: "Toys" }],
          });
        }

        if (getCallCount === 3) {
          return HttpResponse.json({
            success: true,
            category: [...mockCategories, { _id: "cat-4", name: "Games" }],
          });
        }

        return HttpResponse.json({
          success: true,
          category: mockCategories,
        });
      }),

      http.post("*/api/v1/category/create-category", async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          message: "new category created",
          category: { _id: "cat-4", name: body.name },
        });
      }),

      http.put(
        "*/api/v1/category/update-category/cat-4",
        async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            message: "Category Updated Successfully",
            category: { _id: "cat-4", name: body.name },
          });
        },
      ),

      http.delete("*/api/v1/category/delete-category/cat-4", () =>
        HttpResponse.json({
          success: true,
          message: "Category Deleted Successfully",
        }),
      ),
    );

    renderCreateCategoryPage();

    await waitFor(() =>
      expect(screen.getByText("Electronics")).toBeInTheDocument(),
    );
    expect(screen.getByText("Clothing")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();

    const createInput = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(createInput, { target: { value: "Toys" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByText("Toys is created");

    await waitFor(() => expect(screen.getByText("Toys")).toBeInTheDocument());

    expect(createInput.value).toBe("");

    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);

    const modalInput = await screen.findByDisplayValue("Toys");
    expect(modalInput).toBeInTheDocument();

    fireEvent.change(modalInput, { target: { value: "Games" } });

    const submitButtons = screen.getAllByRole("button", { name: "Submit" });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await screen.findByText("Games is updated");

    await waitFor(() => {
      expect(screen.getByText("Games")).toBeInTheDocument();
      expect(screen.queryByText("Toys")).not.toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await screen.findByText("Category is deleted");

    await waitFor(() =>
      expect(screen.queryByText("Games")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });
});
