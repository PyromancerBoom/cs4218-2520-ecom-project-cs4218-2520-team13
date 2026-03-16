//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Helmet from "react-helmet";
import About from "../pages/About";

jest.mock("../components/Header", () => () => (
  <div data-testid="mock-header">Mock Header</div>
));
jest.mock("../components/Footer", () => () => (
  <div data-testid="mock-footer">Mock Footer</div>
));

function renderAbout() {
  return render(
    <MemoryRouter initialEntries={["/about"]}>
      <Routes>
        <Route path="/about" element={<About />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  document.title = "";
  document
    .head
    .querySelectorAll("meta[name]")
    .forEach((el) => el.remove());
});

describe("About Page - Route Rendering", () => {
  // Aashim Mahindroo, A0265890R
  test("Route-1: About page renders without crashing at /about route", () => {
    expect(() => renderAbout()).not.toThrow();
  });

  // Aashim Mahindroo, A0265890R
  test("Route-2: About page content is present in the DOM after navigating to /about", () => {
    renderAbout();
    expect(screen.getByText("Add text")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Route-3: About page renders the about image", () => {
    renderAbout();
    const img = screen.getByRole("img", { name: /contactus/i });
    expect(img).toBeInTheDocument();
  });
});

describe("About Page - Layout Component Integration", () => {
  // Aashim Mahindroo, A0265890R
  test("Layout-1: Header component is rendered on the About page", () => {
    renderAbout();
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-2: Footer component is rendered on the About page", () => {
    renderAbout();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-3: About content is rendered inside a <main> element", () => {
    renderAbout();
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toContainElement(screen.getByText("Add text"));
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-4: Header appears before the About content in the DOM", () => {
    renderAbout();
    const header = screen.getByTestId("mock-header");
    const main = document.querySelector("main");
    expect(
      header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-5: Footer appears after the About content in the DOM", () => {
    renderAbout();
    const main = document.querySelector("main");
    const footer = screen.getByTestId("mock-footer");
    expect(
      main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Layout-6: <main> element has minHeight style of 70vh", () => {
    renderAbout();
    const main = document.querySelector("main");
    expect(main.style.minHeight).toBe("70vh");
  });
});

describe("About Page - Page Title via Helmet", () => {
  // Aashim Mahindroo, A0265890R
  test("Title-1: document.title is set to 'About us - Ecommerce app'", () => {
    renderAbout();
    expect(Helmet.peek().title).toBe("About us - Ecommerce app");
  });

  // Aashim Mahindroo, A0265890R
  test("Title-2: document.title contains 'About us'", () => {
    renderAbout();
    expect(Helmet.peek().title).toMatch(/About us/i);
  });

  // Aashim Mahindroo, A0265890R
  test("Title-3: document.title contains 'Ecommerce app'", () => {
    renderAbout();
    expect(Helmet.peek().title).toMatch(/Ecommerce app/i);
  });

  // Aashim Mahindroo, A0265890R
  test("Title-4: document.title does NOT use the Layout default title", () => {
    renderAbout();
    expect(Helmet.peek().title).not.toBe("Ecommerce app - shop now");
  });
});

describe("About Page - Content and Information", () => {
  // Aashim Mahindroo, A0265890R
  test("Content-1: renders a paragraph element with text content", () => {
    renderAbout();
    const para = screen.getByText("Add text");
    expect(para.tagName).toBe("P");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-2: about image has src set to /images/about.jpeg", () => {
    renderAbout();
    const img = screen.getByRole("img", { name: /contactus/i });
    expect(img).toHaveAttribute("src", "/images/about.jpeg");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-3: about image has alt attribute 'contactus'", () => {
    renderAbout();
    const img = screen.getByRole("img", { name: /contactus/i });
    expect(img).toHaveAttribute("alt", "contactus");
  });

  // Aashim Mahindroo, A0265890R
  test("Content-4: about image has width style of 100%", () => {
    renderAbout();
    const img = screen.getByRole("img", { name: /contactus/i });
    expect(img.style.width).toBe("100%");
  });
});

describe("About Page - Styling and Layout Classes", () => {
  // Aashim Mahindroo, A0265890R
  test("Style-1: outer content wrapper has Bootstrap 'row' class", () => {
    renderAbout();
    const row = document.querySelector(".row.contactus");
    expect(row).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Style-2: image column has Bootstrap 'col-md-6' class", () => {
    renderAbout();
    const imgCol = document.querySelector(".col-md-6");
    expect(imgCol).not.toBeNull();
    expect(imgCol).toContainElement(
      screen.getByRole("img", { name: /contactus/i })
    );
  });

  // Aashim Mahindroo, A0265890R
  test("Style-3: text column has Bootstrap 'col-md-4' class", () => {
    renderAbout();
    const textCol = document.querySelector(".col-md-4");
    expect(textCol).not.toBeNull();
    expect(textCol).toContainElement(screen.getByText("Add text"));
  });

  // Aashim Mahindroo, A0265890R
  test("Style-4: paragraph has 'text-justify' class", () => {
    renderAbout();
    const para = screen.getByText("Add text");
    expect(para).toHaveClass("text-justify");
  });

  // Aashim Mahindroo, A0265890R
  test("Style-5: paragraph has 'mt-2' margin-top class", () => {
    renderAbout();
    const para = screen.getByText("Add text");
    expect(para).toHaveClass("mt-2");
  });

  // Aashim Mahindroo, A0265890R
  test("Style-6: row container has 'contactus' class for specific page styling", () => {
    renderAbout();
    expect(document.querySelector(".contactus")).not.toBeNull();
  });
});
