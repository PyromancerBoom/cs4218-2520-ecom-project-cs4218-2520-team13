//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Helmet from "react-helmet";
import Pagenotfound from "../pages/Pagenotfound";

// ---------------------------------------------------------------------------
// Mock Header and Footer to isolate Pagenotfound + Layout from their
// dependencies (auth context, useCategory API calls, etc.)
// ---------------------------------------------------------------------------
jest.mock("../components/Header", () => () => (
  <div data-testid="mock-header">Mock Header</div>
));
jest.mock("../components/Footer", () => () => (
  <div data-testid="mock-footer">Mock Footer</div>
));

// ---------------------------------------------------------------------------
// Helper – render Pagenotfound inside a router
// ---------------------------------------------------------------------------
function renderPagenotfound() {
  return render(
    <MemoryRouter initialEntries={["/some/nonexistent/route"]}>
      <Routes>
        {/* Wildcard matches any undefined route, same as App.js */}
        <Route path="*" element={<Pagenotfound />} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Clean Helmet state between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  document.title = "";
  document
    .head
    .querySelectorAll("meta[name]")
    .forEach((el) => el.remove());
});

// ===========================================================================
// 1. Route – navigating to a non-existent path renders the 404 page
// ===========================================================================
describe("Pagenotfound - Route Rendering", () => {
  // Aashim Mahindroo, A0265890R
  test("Route-1: renders without crashing for an unknown route", () => {
    expect(() => renderPagenotfound()).not.toThrow();
  });

  // Aashim Mahindroo, A0265890R
  test("Route-2: wildcard route renders Pagenotfound at any undefined path", () => {
    render(
      <MemoryRouter initialEntries={["/this/does/not/exist"]}>
        <Routes>
          <Route path="*" element={<Pagenotfound />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Route-3: renders the 404 heading", () => {
    renderPagenotfound();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Route-4: renders the 'Oops ! Page Not Found' message", () => {
    renderPagenotfound();
    expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. Layout Integration
// ===========================================================================
describe("Pagenotfound - Layout Component Integration", () => {
  // Aashim Mahindroo, A0265890R
  test("Layout-1: Header component is rendered on the 404 page", () => {
    renderPagenotfound();
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-2: Footer component is rendered on the 404 page", () => {
    renderPagenotfound();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-3: 404 content is rendered inside a <main> element", () => {
    renderPagenotfound();
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toContainElement(screen.getByText("404"));
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-4: Header appears before the main content in the DOM", () => {
    renderPagenotfound();
    const header = screen.getByTestId("mock-header");
    const main = document.querySelector("main");
    expect(
      header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-5: Footer appears after the main content in the DOM", () => {
    renderPagenotfound();
    const main = document.querySelector("main");
    const footer = screen.getByTestId("mock-footer");
    expect(
      main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-6: <main> element has minHeight style of 70vh", () => {
    renderPagenotfound();
    const main = document.querySelector("main");
    expect(main.style.minHeight).toBe("70vh");
  });
});

// ===========================================================================
// 3. Page Title via Helmet
// ===========================================================================
describe("Pagenotfound - Page Title", () => {
  // Aashim Mahindroo, A0265890R
  test("Title-1: document.title is set to 'go back- page not found'", () => {
    renderPagenotfound();
    expect(Helmet.peek().title).toBe("go back- page not found");
  });

  // Aashim Mahindroo, A0265890R
  test("Title-2: document.title contains 'page not found'", () => {
    renderPagenotfound();
    expect(Helmet.peek().title).toMatch(/page not found/i);
  });

  // Aashim Mahindroo, A0265890R
  test("Title-3: document.title does NOT use Layout's default title", () => {
    renderPagenotfound();
    expect(Helmet.peek().title).not.toBe("Ecommerce app - shop now");
  });
});

// ===========================================================================
// 4. 404 Page Content
// ===========================================================================
describe("Pagenotfound - Page Content", () => {
  // Aashim Mahindroo, A0265890R
  test("Content-1: '404' is rendered inside an h1 element", () => {
    renderPagenotfound();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("404");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-2: 'Oops ! Page Not Found' is rendered inside an h2 element", () => {
    renderPagenotfound();
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("Oops ! Page Not Found");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-3: 'Go Back' link is present on the 404 page", () => {
    renderPagenotfound();
    expect(screen.getByRole("link", { name: "Go Back" })).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Content-4: 'Go Back' link points to the homepage '/'", () => {
    renderPagenotfound();
    const link = screen.getByRole("link", { name: "Go Back" });
    expect(link).toHaveAttribute("href", "/");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-5: all three elements (h1, h2, link) are present together", () => {
    renderPagenotfound();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Back" })).toBeInTheDocument();
  });
});

// ===========================================================================
// 5. Styling and CSS Classes
// ===========================================================================
describe("Pagenotfound - Styling and CSS Classes", () => {
  // Aashim Mahindroo, A0265890R
  test("Style-1: outer container has class 'pnf'", () => {
    renderPagenotfound();
    expect(document.querySelector(".pnf")).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Style-2: h1 element has class 'pnf-title'", () => {
    renderPagenotfound();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("pnf-title");
  });

  // Aashim Mahindroo, A0265890R
  test("Style-3: h2 element has class 'pnf-heading'", () => {
    renderPagenotfound();
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveClass("pnf-heading");
  });

  // Aashim Mahindroo, A0265890R
  test("Style-4: 'Go Back' link has class 'pnf-btn'", () => {
    renderPagenotfound();
    const link = screen.getByRole("link", { name: "Go Back" });
    expect(link).toHaveClass("pnf-btn");
  });

  // Aashim Mahindroo, A0265890R
  test("Style-5: 'pnf' container wraps both headings and the Go Back link", () => {
    renderPagenotfound();
    const container = document.querySelector(".pnf");
    expect(container).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(container).toContainElement(screen.getByRole("heading", { level: 2 }));
    expect(container).toContainElement(screen.getByRole("link", { name: "Go Back" }));
  });
});

// ===========================================================================
// 6. App-level Routing – wildcard catches all undefined routes
// ===========================================================================
describe("Pagenotfound - App Routing Integration", () => {
  function renderApp(path) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div data-testid="home">Home</div>} />
          <Route path="*" element={<Pagenotfound />} />
        </Routes>
      </MemoryRouter>
    );
  }

  // Aashim Mahindroo, A0265890R
  test("AppRoute-1: known route '/' does NOT render the 404 page", () => {
    renderApp("/");
    expect(screen.queryByText("404")).not.toBeInTheDocument();
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("AppRoute-2: unknown route '/random-page' renders the 404 page", () => {
    renderApp("/random-page");
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("AppRoute-3: unknown route '/a/b/c' renders the 404 page", () => {
    renderApp("/a/b/c");
    expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("AppRoute-4: 404 page does not render the home page content", () => {
    renderApp("/nonexistent");
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });
});
