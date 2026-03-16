//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from "react";
import { render, screen, act, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "../context/cart";

let store = {};

beforeEach(() => {
  store = {};
  Storage.prototype.getItem = jest.fn((key) => store[key] ?? null);
  Storage.prototype.setItem = jest.fn((key, value) => {
    store[key] = value.toString();
  });
  Storage.prototype.removeItem = jest.fn((key) => {
    delete store[key];
  });
  Storage.prototype.clear = jest.fn(() => {
    store = {};
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  store = {};
});

const CartConsumer = () => {
  const [cart, setCart] = useCart();

  const addItem = (item) => setCart((prev) => [...prev, item]);
  const removeItem = (id) =>
    setCart((prev) => prev.filter((p) => p._id !== id));
  const clearCart = () => setCart([]);

  return (
    <div>
      <span data-testid="cart-count">{cart.length}</span>
      <ul>
        {cart.map((item) => (
          <li key={item._id} data-testid={`item-${item._id}`}>
            {item.name}
            <button
              aria-label={`remove-${item._id}`}
              onClick={() => removeItem(item._id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        data-testid="add-item"
        onClick={() =>
          addItem({ _id: `id-${Date.now()}`, name: "New Item", price: 10 })
        }
      >
        Add Item
      </button>
      <button data-testid="clear-cart" onClick={clearCart}>
        Clear Cart
      </button>
    </div>
  );
};

const CartBadge = () => {
  const [cart] = useCart();
  return <span data-testid="badge-count">{cart.length}</span>;
};

const CartReplacer = ({ items }) => {
  const [, setCart] = useCart();
  return (
    <button
      data-testid="replace-cart"
      onClick={() => setCart(items)}
    >
      Replace
    </button>
  );
};

function renderWithCart(...consumers) {
  return render(
    <CartProvider>
      {consumers.map((C, i) => (
        <C key={i} />
      ))}
    </CartProvider>
  );
}

const PRODUCT_A = { _id: "p1", name: "Widget A", price: 9.99 };
const PRODUCT_B = { _id: "p2", name: "Widget B", price: 19.99 };
const PRODUCT_C = { _id: "p3", name: "Widget C", price: 4.99 };

describe("Cart Context Integration – Initialization from localStorage", () => {
  // Aashim Mahindroo, A0265890R
  test("Init-1: initializes with an empty array when localStorage has no cart key", () => {
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Init-2: initializes cart from a single product stored in localStorage", () => {
    store["cart"] = JSON.stringify([PRODUCT_A]);
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect(screen.getByTestId("item-p1")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Init-3: initializes cart from multiple products stored in localStorage", () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("3");
    expect(screen.getByTestId("item-p1")).toBeInTheDocument();
    expect(screen.getByTestId("item-p2")).toBeInTheDocument();
    expect(screen.getByTestId("item-p3")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Init-4: initializes with empty array when localStorage.getItem returns null", () => {
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Init-5: initializes with empty array when localStorage contains empty JSON array '[]'", () => {
    store["cart"] = "[]";
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Init-6: falls back to empty array and logs error for corrupted JSON in localStorage", () => {
    store["cart"] = "INVALID_JSON_{{{{";
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // Aashim Mahindroo, A0265890R
  test("Init-7: preserves product fields (name, price) exactly as stored in localStorage", () => {
    store["cart"] = JSON.stringify([PRODUCT_A]);
    renderWithCart(CartConsumer);
    expect(screen.getByText("Widget A")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Init-8: reads from localStorage exactly once during initial mount", () => {
    store["cart"] = JSON.stringify([PRODUCT_A]);
    renderWithCart(CartConsumer);
    expect(Storage.prototype.getItem).toHaveBeenCalledWith("cart");
    expect(Storage.prototype.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("Cart Context Integration – Automatic localStorage Persistence", () => {
  // Aashim Mahindroo, A0265890R
  test("Persist-1: persists a newly added item to localStorage immediately", async () => {
    renderWithCart(CartConsumer);
    await act(async () => {
      screen.getByTestId("add-item").click();
    });
    const stored = JSON.parse(store["cart"]);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("New Item");
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-2: localStorage is updated after every successive add", async () => {
    renderWithCart(CartConsumer);
    await act(async () => {
      screen.getByTestId("add-item").click();
    });
    await act(async () => {
      screen.getByTestId("add-item").click();
    });
    const stored = JSON.parse(store["cart"]);
    expect(stored).toHaveLength(2);
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-3: localStorage reflects removal of an item", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByLabelText("remove-p1").click();
    });

    const stored = JSON.parse(store["cart"]);
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe("p2");
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-4: localStorage stores empty array after clearing the cart", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("clear-cart").click();
    });

    expect(store["cart"]).toBe(JSON.stringify([]));
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-5: localStorage is updated when cart is replaced wholesale", async () => {
    const replacement = [PRODUCT_A, PRODUCT_C];
    render(
      <CartProvider>
        <CartReplacer items={replacement} />
        <CartConsumer />
      </CartProvider>
    );

    await act(async () => {
      screen.getByTestId("replace-cart").click();
    });

    const stored = JSON.parse(store["cart"]);
    expect(stored).toHaveLength(2);
    expect(stored[0]._id).toBe("p1");
    expect(stored[1]._id).toBe("p3");
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-6: setItem is called with key 'cart' on every state change", async () => {
    renderWithCart(CartConsumer);
    const callsBefore = Storage.prototype.setItem.mock.calls
      .filter((c) => c[0] === "cart").length;

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    const callsAfter = Storage.prototype.setItem.mock.calls
      .filter((c) => c[0] === "cart").length;

    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  // Aashim Mahindroo, A0265890R
  test("Persist-7: cart state and localStorage stay in sync after add-then-remove", async () => {
    renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("add-item").click();
    });
    let stored = JSON.parse(store["cart"]);
    const addedId = stored[0]._id;

    await act(async () => {
      screen.getByLabelText(`remove-${addedId}`).click();
    });

    stored = JSON.parse(store["cart"]);
    expect(stored).toHaveLength(0);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });
});

describe("Cart Context Integration – Lazy Initialization Edge Cases", () => {
  // Aashim Mahindroo, A0265890R
  test("Lazy-1: starts with [] when 'cart' key is absent", () => {
    // store is empty by default
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current[0]).toEqual([]);
  });

  // Aashim Mahindroo, A0265890R
  test("Lazy-2: starts with [] when localStorage.getItem returns null explicitly", () => {
    Storage.prototype.getItem = jest.fn(() => null);
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current[0]).toEqual([]);
  });

  // Aashim Mahindroo, A0265890R
  test("Lazy-3: does not throw when cart key is missing entirely", () => {
    expect(() =>
      renderWithCart(CartConsumer)
    ).not.toThrow();
  });

  // Aashim Mahindroo, A0265890R
  test("Lazy-4: initializer runs only once even if the component re-renders", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A]);
    renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    expect(Storage.prototype.getItem).toHaveBeenCalledTimes(1);
  });

  // Aashim Mahindroo, A0265890R
  test("Lazy-5: does not write to localStorage before any user interaction", () => {
    renderWithCart(CartConsumer);
    expect(store["cart"]).toBe(JSON.stringify([]));
  });

  // Aashim Mahindroo, A0265890R
  test("Lazy-6: falls back to [] when localStorage throws a security error", () => {
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error("SecurityError: localStorage access denied");
    });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    expect(result.current[0]).toEqual([]);
    spy.mockRestore();
  });
});

describe("Cart Context Integration – State Across Re-renders", () => {
  // Aashim Mahindroo, A0265890R
  test("Rerender-1: cart items are not lost when the consumer re-renders", async () => {
    const { rerender } = render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    rerender(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
  });

  // Aashim Mahindroo, A0265890R
  test("Rerender-2: multiple rapid state updates accumulate correctly", async () => {
    renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("add-item").click();
      screen.getByTestId("add-item").click();
      screen.getByTestId("add-item").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("3");
  });

  // Aashim Mahindroo, A0265890R
  test("Rerender-3: UI reflects cart count immediately after adding an item", async () => {
    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
  });

  // Aashim Mahindroo, A0265890R
  test("Rerender-4: UI reflects cart count immediately after removing an item", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    renderWithCart(CartConsumer);

    expect(screen.getByTestId("cart-count").textContent).toBe("2");

    await act(async () => {
      screen.getByLabelText("remove-p1").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
  });

  // Aashim Mahindroo, A0265890R
  test("Rerender-5: UI shows 0 after clearing a populated cart", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B, PRODUCT_C]);
    renderWithCart(CartConsumer);

    expect(screen.getByTestId("cart-count").textContent).toBe("3");

    await act(async () => {
      screen.getByTestId("clear-cart").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Rerender-6: item list DOM nodes are removed after deletion", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A]);
    renderWithCart(CartConsumer);

    expect(screen.getByTestId("item-p1")).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText("remove-p1").click();
    });

    expect(screen.queryByTestId("item-p1")).not.toBeInTheDocument();
  });
});

describe("Cart Context Integration – Shared State Across Multiple Consumers", () => {
  // Aashim Mahindroo, A0265890R
  test("Share-1: two consumers mounted under same provider see the same initial count", () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    renderWithCart(CartConsumer, CartBadge);
    expect(screen.getByTestId("cart-count").textContent).toBe("2");
    expect(screen.getByTestId("badge-count").textContent).toBe("2");
  });

  // Aashim Mahindroo, A0265890R
  test("Share-2: update from CartConsumer is reflected in CartBadge immediately", async () => {
    renderWithCart(CartConsumer, CartBadge);

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    expect(screen.getByTestId("badge-count").textContent).toBe("1");
  });

  // Aashim Mahindroo, A0265890R
  test("Share-3: both consumers show count 0 after cart is cleared", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    renderWithCart(CartConsumer, CartBadge);

    await act(async () => {
      screen.getByTestId("clear-cart").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("0");
    expect(screen.getByTestId("badge-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Share-4: replacing cart from one consumer updates all consumers", async () => {
    const replacement = [PRODUCT_C];
    render(
      <CartProvider>
        <CartReplacer items={replacement} />
        <CartConsumer />
        <CartBadge />
      </CartProvider>
    );

    await act(async () => {
      screen.getByTestId("replace-cart").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect(screen.getByTestId("badge-count").textContent).toBe("1");
    expect(screen.getByTestId("item-p3")).toBeInTheDocument();
  });
});

describe("Cart Context Integration – Mount/Unmount/Remount Cycle", () => {
  // Aashim Mahindroo, A0265890R
  test("Cycle-1: cart state is restored from localStorage after provider is remounted", async () => {
    const { unmount } = renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    expect(JSON.parse(store["cart"])).toHaveLength(1);

    unmount();

    renderWithCart(CartConsumer);

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
  });

  // Aashim Mahindroo, A0265890R
  test("Cycle-2: cleared cart persists as empty array after remount", async () => {
    store["cart"] = JSON.stringify([PRODUCT_A, PRODUCT_B]);
    const { unmount } = renderWithCart(CartConsumer);

    await act(async () => {
      screen.getByTestId("clear-cart").click();
    });

    unmount();

    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Aashim Mahindroo, A0265890R
  test("Cycle-3: items added across two mount cycles accumulate in localStorage", async () => {
    const { unmount } = renderWithCart(CartConsumer);
    await act(async () => {
      screen.getByTestId("add-item").click();
    });
    unmount();

    renderWithCart(CartConsumer);
    await act(async () => {
      screen.getByTestId("add-item").click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("2");
    expect(JSON.parse(store["cart"])).toHaveLength(2);
  });

  // Aashim Mahindroo, A0265890R
  test("Cycle-4: provider with empty localStorage starts fresh on every cold mount", () => {
    const { unmount } = renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
    unmount();

    store = {};

    renderWithCart(CartConsumer);
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });
});
