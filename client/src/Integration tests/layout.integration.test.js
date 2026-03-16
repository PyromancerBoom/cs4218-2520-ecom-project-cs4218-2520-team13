
//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.


import React from "react";
import { render, screen } from "@testing-library/react";
import Helmet from "react-helmet";
import Layout from "../components/Layout";
jest.mock("../components/Header", () => () => (
  <div data-testid="mock-header">Mock Header</div>
));
jest.mock("../components/Footer", () => () => (
  <div data-testid="mock-footer">Mock Footer</div>
));

function renderLayout(props = {}, children = <span data-testid="default-child">Child</span>) {
  return render(<Layout {...props}>{children}</Layout>);
}

beforeEach(() => {
  Helmet.canUseDOM = true;
});

function getHelmetMeta(name) {
  const metaTags = Helmet.peek().metaTags || [];
  return metaTags.find((m) => m.name === name) || null;
}

function getHelmetCharset() {
  const metaTags = Helmet.peek().metaTags || [];
  return (
    metaTags.find(
      (m) =>
        Object.prototype.hasOwnProperty.call(m, "charSet") ||
        Object.prototype.hasOwnProperty.call(m, "charset")
    ) || null
  );
}

describe("Layout - Default Props and SEO Meta Tags", () => {
  // Aashim Mahindroo, A0265890R
  test("Default-1: renders default page title 'Ecommerce app - shop now'", () => {
    renderLayout();
    expect(Helmet.peek().title).toBe("Ecommerce app - shop now");
  });

  // Aashim Mahindroo, A0265890R
  test("Default-2: renders default meta description 'mern stack project'", () => {
    renderLayout();
    const meta = getHelmetMeta("description");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("mern stack project");
  });

  // Aashim Mahindroo, A0265890R
  test("Default-3: renders default meta keywords 'mern,react,node,mongodb'", () => {
    renderLayout();
    const meta = getHelmetMeta("keywords");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("mern,react,node,mongodb");
  });

  // Aashim Mahindroo, A0265890R
  test("Default-4: renders default meta author 'Techinfoyt'", () => {
    renderLayout();
    const meta = getHelmetMeta("author");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("Techinfoyt");
  });

  // Aashim Mahindroo, A0265890R
  test("Default-5: renders meta charset set to 'utf-8'", () => {
    renderLayout();
    const meta = getHelmetCharset();
    expect(meta).not.toBeNull();
    // react-helmet may store as charSet (React prop) or charset (HTML attribute)
    const value = meta.charSet || meta.charset;
    expect(value).toBe("utf-8");
  });
});

describe("Layout - Custom Props Override SEO Meta Tags", () => {
  // Aashim Mahindroo, A0265890R
  test("Custom-1: custom title prop updates document title", () => {
    renderLayout({ title: "My Custom Page Title" });
    expect(Helmet.peek().title).toBe("My Custom Page Title");
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-2: custom description prop updates meta description", () => {
    renderLayout({ description: "A custom page description" });
    const meta = getHelmetMeta("description");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("A custom page description");
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-3: custom keywords prop updates meta keywords", () => {
    renderLayout({ keywords: "custom,keywords,test" });
    const meta = getHelmetMeta("keywords");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("custom,keywords,test");
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-4: custom author prop updates meta author", () => {
    renderLayout({ author: "Jane Doe" });
    const meta = getHelmetMeta("author");
    expect(meta).not.toBeNull();
    expect(meta.content).toBe("Jane Doe");
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-5: empty string title prop results in no title set in Helmet", () => {
    renderLayout({ title: "" });
    // react-helmet does not store an empty string as a title; it returns undefined
    expect(Helmet.peek().title).toBeFalsy();
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-6: all four props can be customised simultaneously", () => {
    renderLayout({
      title: "Multi-Custom Title",
      description: "Multi desc",
      keywords: "multi,custom",
      author: "Multi Author",
    });
    expect(Helmet.peek().title).toBe("Multi-Custom Title");
    expect(getHelmetMeta("description").content).toBe("Multi desc");
    expect(getHelmetMeta("keywords").content).toBe("multi,custom");
    expect(getHelmetMeta("author").content).toBe("Multi Author");
  });
});

describe("Layout - Helmet Updates document.head", () => {
  // Aashim Mahindroo, A0265890R
  test("Helmet-1: document.title updates when title prop changes on re-render", () => {
    const { rerender } = render(
      <Layout title="First Title">
        <span />
      </Layout>
    );
    expect(Helmet.peek().title).toBe("First Title");

    rerender(
      <Layout title="Second Title">
        <span />
      </Layout>
    );
    expect(Helmet.peek().title).toBe("Second Title");
  });

  // Aashim Mahindroo, A0265890R
  test("Helmet-2: meta description updates when description prop changes on re-render", () => {
    const { rerender } = render(
      <Layout description="Original description">
        <span />
      </Layout>
    );
    expect(getHelmetMeta("description").content).toBe("Original description");

    rerender(
      <Layout description="Updated description">
        <span />
      </Layout>
    );
    expect(getHelmetMeta("description").content).toBe("Updated description");
  });

  // Aashim Mahindroo, A0265890R
  test("Helmet-3: meta keywords updates when keywords prop changes on re-render", () => {
    const { rerender } = render(
      <Layout keywords="old,keywords">
        <span />
      </Layout>
    );
    expect(getHelmetMeta("keywords").content).toBe("old,keywords");

    rerender(
      <Layout keywords="new,keywords">
        <span />
      </Layout>
    );
    expect(getHelmetMeta("keywords").content).toBe("new,keywords");
  });

  // Aashim Mahindroo, A0265890R
  test("Helmet-4: all four meta fields are present in Helmet state after render", () => {
    renderLayout({ title: "T", description: "D", keywords: "K", author: "A" });
    expect(getHelmetMeta("description")).not.toBeNull();
    expect(getHelmetMeta("keywords")).not.toBeNull();
    expect(getHelmetMeta("author")).not.toBeNull();
    // Title is also present
    expect(Helmet.peek().title).toBe("T");
  });
});

describe("Layout - Header Component Rendered at Top", () => {
  // Aashim Mahindroo, A0265890R
  test("Header-1: Header component is present in the DOM", () => {
    renderLayout();
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Header-2: Header appears before the main content in the DOM", () => {
    renderLayout({}, <div data-testid="page-content">Page</div>);
    const header = screen.getByTestId("mock-header");
    const main = document.querySelector("main");
    // DOCUMENT_POSITION_FOLLOWING means `main` comes after `header`
    expect(
      header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Header-3: Header appears before the Footer in the DOM", () => {
    renderLayout();
    const header = screen.getByTestId("mock-header");
    const footer = screen.getByTestId("mock-footer");
    expect(
      header.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe("Layout - Children Rendered in Main Content Area", () => {
  // Aashim Mahindroo, A0265890R
  test("Children-1: single child element is rendered", () => {
    renderLayout({}, <div data-testid="my-child">Hello</div>);
    expect(screen.getByTestId("my-child")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Children-2: child text content is rendered correctly", () => {
    renderLayout({}, <p>Unique text content 42</p>);
    expect(screen.getByText("Unique text content 42")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Children-3: multiple children are all rendered", () => {
    render(
      <Layout>
        <div data-testid="child-a">A</div>
        <div data-testid="child-b">B</div>
        <div data-testid="child-c">C</div>
      </Layout>
    );
    expect(screen.getByTestId("child-a")).toBeInTheDocument();
    expect(screen.getByTestId("child-b")).toBeInTheDocument();
    expect(screen.getByTestId("child-c")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Children-4: children are wrapped inside a <main> element", () => {
    renderLayout({}, <span data-testid="in-main">inside</span>);
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    expect(main).toContainElement(screen.getByTestId("in-main"));
  });

  // Aashim Mahindroo, A0265890R
  test("Children-5: <main> element has minHeight style of '70vh'", () => {
    renderLayout();
    const main = document.querySelector("main");
    expect(main.style.minHeight).toBe("70vh");
  });

  // Aashim Mahindroo, A0265890R
  test("Children-6: Header and Footer are NOT inside the <main> element", () => {
    renderLayout();
    const main = document.querySelector("main");
    expect(main).not.toContainElement(screen.getByTestId("mock-header"));
    expect(main).not.toContainElement(screen.getByTestId("mock-footer"));
  });

  // Aashim Mahindroo, A0265890R
  test("Children-7: does not crash when no children are provided", () => {
    expect(() => render(<Layout />)).not.toThrow();
  });
});

describe("Layout - Footer Component Rendered at Bottom", () => {
  // Aashim Mahindroo, A0265890R
  test("Footer-1: Footer component is present in the DOM", () => {
    renderLayout();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Footer-2: Footer appears after the main content in the DOM", () => {
    renderLayout({}, <div data-testid="page-content">Page</div>);
    const main = document.querySelector("main");
    const footer = screen.getByTestId("mock-footer");
    // DOCUMENT_POSITION_FOLLOWING means `footer` comes after `main`
    expect(
      main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Aashim Mahindroo, A0265890R
  test("Footer-3: Footer appears after the Header in the DOM", () => {
    renderLayout();
    const header = screen.getByTestId("mock-header");
    const footer = screen.getByTestId("mock-footer");
    expect(
      header.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
