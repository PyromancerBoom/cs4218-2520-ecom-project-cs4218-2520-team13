//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and recommended testing methods like equivalence partitioning and boundary value analysis, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments like adjusting mocks and assertions, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import Spinner from "../components/Spinner";

// ---------------------------------------------------------------------------
// react-router-dom mock
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
const mockLocation = { pathname: "/protected-page" };

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// ---------------------------------------------------------------------------
// Per-test setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.useFakeTimers();
  mockNavigate.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ===========================================================================
// 1. Countdown Timer Starting Value
// ===========================================================================
describe("Spinner - Countdown Timer Starting Value", () => {
  // Aashim Mahindroo, A0265890R
  test("Count-1: displays countdown starting at 3 on initial render", () => {
    render(<Spinner />);
    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Count-2: countdown text includes the word 'redirecting'", () => {
    render(<Spinner />);
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Count-3: countdown text includes the word 'second'", () => {
    render(<Spinner />);
    expect(screen.getByText(/second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Count-4: countdown is rendered inside an h1 element", () => {
    render(<Spinner />);
    const heading = document.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(heading.textContent).toMatch(/3/);
  });
});

// ===========================================================================
// 2. Countdown Decreases Every Second
// ===========================================================================
describe("Spinner - Countdown Decreases Every Second", () => {
  // Aashim Mahindroo, A0265890R
  test("Tick-1: countdown decrements from 3 to 2 after 1 second", () => {
    render(<Spinner />);
    expect(screen.getByText(/3 second/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));

    expect(screen.getByText(/2 second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Tick-2: countdown decrements from 2 to 1 after another second", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/2 second/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/1 second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Tick-3: countdown decrements to 0 after 3 seconds total", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000));

    expect(screen.getByText(/0 second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Tick-4: countdown does NOT show 2 before 1 second has elapsed", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(500));

    expect(screen.getByText(/3 second/i)).toBeInTheDocument();
    expect(screen.queryByText(/2 second/i)).not.toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Tick-5: navigate is NOT called before countdown reaches 0", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(2000)); // at count=1, not yet redirected

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 3. Redirect to Default Path (/login) When Count Reaches 0
// ===========================================================================
describe("Spinner - Default Redirect to /login", () => {
  // Aashim Mahindroo, A0265890R
  test("Default-1: navigates to /login after 3 seconds when no path prop given", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/login", expect.anything());
  });

  // Aashim Mahindroo, A0265890R
  test("Default-2: navigate is called exactly once after 3 seconds", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  // Aashim Mahindroo, A0265890R
  test("Default-3: navigate passes current location pathname as state", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/protected-page",
    });
  });

  // Aashim Mahindroo, A0265890R
  test("Default-4: navigate is NOT called at 0 ms (no premature redirect)", () => {
    render(<Spinner />);
    // No time advanced
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Aashim Mahindroo, A0265890R
  test("Default-5: navigate is NOT called after only 1 second", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(1000));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Aashim Mahindroo, A0265890R
  test("Default-6: navigate is NOT called after only 2 seconds", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(2000));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 4. Redirect to Custom Path When path Prop Is Provided
// ===========================================================================
describe("Spinner - Custom Path Redirect via path Prop", () => {
  // Aashim Mahindroo, A0265890R
  test("Custom-1: navigates to /dashboard when path='dashboard' after 3 seconds", () => {
    render(<Spinner path="dashboard" />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
      state: "/protected-page",
    });
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-2: navigates to /home when path='home' after 3 seconds", () => {
    render(<Spinner path="home" />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/home", {
      state: "/protected-page",
    });
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-3: navigates to /dashboard/user when path='dashboard/user'", () => {
    render(<Spinner path="dashboard/user" />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user", {
      state: "/protected-page",
    });
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-4: custom path does not affect countdown behavior", () => {
    render(<Spinner path="dashboard" />);

    expect(screen.getByText(/3 second/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/2 second/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText(/1 second/i)).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Custom-5: custom path passes current location pathname as state", () => {
    render(<Spinner path="register" />);

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith("/register", {
      state: "/protected-page",
    });
  });
});

// ===========================================================================
// 5. Spinner Animation Present During Countdown
// ===========================================================================
describe("Spinner - Spinner Animation Elements", () => {
  // Aashim Mahindroo, A0265890R
  test("Anim-1: renders an element with class 'spinner-border'", () => {
    render(<Spinner />);
    expect(document.querySelector(".spinner-border")).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-2: spinner element has role='status'", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-3: spinner contains visually-hidden span with 'Loading...' text", () => {
    render(<Spinner />);
    const span = document.querySelector(".visually-hidden");
    expect(span).not.toBeNull();
    expect(span.textContent).toBe("Loading...");
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-4: spinner is still present after 1 second (not removed mid-countdown)", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(1000));

    expect(document.querySelector(".spinner-border")).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-5: spinner is still present after 2 seconds", () => {
    render(<Spinner />);

    act(() => jest.advanceTimersByTime(2000));

    expect(document.querySelector(".spinner-border")).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-6: container div uses flexbox centering classes", () => {
    render(<Spinner />);
    const container = document.querySelector(
      ".d-flex.flex-column.justify-content-center.align-items-center"
    );
    expect(container).not.toBeNull();
  });

  // Aashim Mahindroo, A0265890R
  test("Anim-7: container div has height of 100vh", () => {
    render(<Spinner />);
    const container = document.querySelector(
      ".d-flex.flex-column.justify-content-center.align-items-center"
    );
    expect(container.style.height).toBe("100vh");
  });
});

// ===========================================================================
// 6. Timer Cleanup on Component Unmount
// ===========================================================================
describe("Spinner - Timer Cleanup on Unmount", () => {
  // Aashim Mahindroo, A0265890R
  test("Cleanup-1: navigate is NOT called if component unmounts before countdown ends", () => {
    const { unmount } = render(<Spinner />);

    act(() => jest.advanceTimersByTime(1000)); // count → 2
    unmount();
    act(() => jest.advanceTimersByTime(3000)); // would have triggered redirect

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Aashim Mahindroo, A0265890R
  test("Cleanup-2: navigate is NOT called if component unmounts immediately", () => {
    const { unmount } = render(<Spinner />);
    unmount();
    act(() => jest.advanceTimersByTime(5000));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Aashim Mahindroo, A0265890R
  test("Cleanup-3: navigate is NOT called after unmount at exactly 2 seconds", () => {
    const { unmount } = render(<Spinner />);

    act(() => jest.advanceTimersByTime(2000)); // count → 1, not yet redirected
    unmount();
    act(() => jest.advanceTimersByTime(2000)); // extra time passes

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Aashim Mahindroo, A0265890R
  test("Cleanup-4: navigate IS called if unmounted after the full 3 seconds", () => {
    const { unmount } = render(<Spinner />);

    act(() => jest.advanceTimersByTime(3000)); // redirect fires
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    unmount(); // unmount after redirect should not throw
  });

  // Aashim Mahindroo, A0265890R
  test("Cleanup-5: rendering and unmounting multiple times does not cause cross-contamination", () => {
    const { unmount: unmount1 } = render(<Spinner />);
    act(() => jest.advanceTimersByTime(1000));
    unmount1();

    mockNavigate.mockClear();

    const { unmount: unmount2 } = render(<Spinner />);
    act(() => jest.advanceTimersByTime(3000));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    unmount2();
  });
});
