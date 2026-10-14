import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColorScheme, ContrastMode, ThemeMode } from "../../types/main";
import { useThemeContext } from "../ThemeContext";
import { ThemeProvider } from "../ThemeProvider";

const LS_KEY = "theme-preferences";

/**
 * A test consumer that renders the current theme preferences and
 * exposes buttons to change each setting.
 */
function TestConsumer() {
  const {
    changeColorScheme,
    changeContrastMode,
    changeThemeMode,
    themePreferences,
  } = useThemeContext();

  return (
    <div>
      <span data-testid="themeMode">{themePreferences.themeMode}</span>
      <span data-testid="colorScheme">{themePreferences.colorScheme}</span>
      <span data-testid="contrastMode">{themePreferences.contrastMode}</span>

      <button onClick={() => changeThemeMode(ThemeMode.PROJECT_FELT)}>
        Set Felt
      </button>
      <button onClick={() => changeThemeMode(ThemeMode.DEFAULT)}>
        Set Default Theme
      </button>
      <button onClick={() => changeColorScheme(ColorScheme.DARK)}>
        Set Dark
      </button>
      <button onClick={() => changeColorScheme(ColorScheme.LIGHT)}>
        Set Light
      </button>
      <button onClick={() => changeColorScheme(ColorScheme.SYSTEM)}>
        Set System Color
      </button>
      <button onClick={() => changeContrastMode(ContrastMode.HIGH_CONTRAST)}>
        Set High Contrast
      </button>
      <button onClick={() => changeContrastMode(ContrastMode.GLASS)}>
        Set Glass
      </button>
      <button onClick={() => changeContrastMode(ContrastMode.DEFAULT)}>
        Set Default Contrast
      </button>
      <button onClick={() => changeContrastMode(ContrastMode.SYSTEM)}>
        Set System Contrast
      </button>
    </div>
  );
}

/**
 * Returns the default matchMedia stub that reports no matches, used
 * to restore the window property between tests.
 */
function defaultMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: defaultMatchMedia,
  });
});

describe("ThemeProvider", () => {
  it("renders children and exposes default preferences", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("themeMode").textContent).toBe(ThemeMode.DEFAULT);
    expect(screen.getByTestId("colorScheme").textContent).toBe(
      ColorScheme.SYSTEM,
    );
    expect(screen.getByTestId("contrastMode").textContent).toBe(
      ContrastMode.SYSTEM,
    );
  });

  it("restores preferences from local storage", () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        themeMode: ThemeMode.PROJECT_FELT,
        colorScheme: ColorScheme.DARK,
        contrastMode: ContrastMode.HIGH_CONTRAST,
      }),
    );

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("themeMode").textContent).toBe(
      ThemeMode.PROJECT_FELT,
    );
    expect(screen.getByTestId("colorScheme").textContent).toBe(
      ColorScheme.DARK,
    );
    expect(screen.getByTestId("contrastMode").textContent).toBe(
      ContrastMode.HIGH_CONTRAST,
    );
  });

  it("falls back to defaults when local storage contains invalid JSON", () => {
    localStorage.setItem(LS_KEY, "not-valid-json");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("themeMode").textContent).toBe(ThemeMode.DEFAULT);
  });

  it("falls back to defaults for invalid enum values in local storage", () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        themeMode: "invented-mode",
        colorScheme: ColorScheme.DARK,
        contrastMode: 42,
      }),
    );

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // Invalid themeMode and contrastMode fall back to defaults,
    // while the valid colorScheme is kept.
    expect(screen.getByTestId("themeMode").textContent).toBe(ThemeMode.DEFAULT);
    expect(screen.getByTestId("colorScheme").textContent).toBe(
      ColorScheme.DARK,
    );
    expect(screen.getByTestId("contrastMode").textContent).toBe(
      ContrastMode.SYSTEM,
    );
  });

  it("falls back to defaults when local storage contains a non-object", () => {
    localStorage.setItem(LS_KEY, JSON.stringify("just a string"));

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("themeMode").textContent).toBe(ThemeMode.DEFAULT);
  });

  it("falls back to defaults for missing fields in local storage", () => {
    localStorage.setItem(LS_KEY, JSON.stringify({ colorScheme: "dark" }));

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("themeMode").textContent).toBe(ThemeMode.DEFAULT);
    expect(screen.getByTestId("colorScheme").textContent).toBe(
      ColorScheme.DARK,
    );
    expect(screen.getByTestId("contrastMode").textContent).toBe(
      ContrastMode.SYSTEM,
    );
  });

  it("persists preferences to local storage on change", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Dark"));

    const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
    expect(stored.colorScheme).toBe(ColorScheme.DARK);
  });

  it("updates theme mode and applies the felt CSS class", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Felt"));

    expect(screen.getByTestId("themeMode").textContent).toBe(
      ThemeMode.PROJECT_FELT,
    );
    expect(document.documentElement.classList).toContain("pf-v6-theme-felt");
  });

  it("removes the felt CSS class when switching back to default", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Felt"));
    expect(document.documentElement.classList).toContain("pf-v6-theme-felt");

    await user.click(screen.getByText("Set Default Theme"));
    expect(document.documentElement.classList).not.toContain(
      "pf-v6-theme-felt",
    );
  });

  it("applies the dark CSS class when dark is selected", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Dark"));

    expect(document.documentElement.classList).toContain("pf-v6-theme-dark");
  });

  it("removes the dark CSS class when light is selected", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Dark"));
    expect(document.documentElement.classList).toContain("pf-v6-theme-dark");

    await user.click(screen.getByText("Set Light"));
    expect(document.documentElement.classList).not.toContain(
      "pf-v6-theme-dark",
    );
  });

  it(
    "applies the high contrast CSS class when high contrast " + "is selected",
    async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByText("Set High Contrast"));

      expect(document.documentElement.classList).toContain(
        "pf-v6-theme-high-contrast",
      );
    },
  );

  it("applies the glass CSS class when glass is selected", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText("Set Glass"));

    expect(document.documentElement.classList).toContain("pf-v6-theme-glass");
  });

  it(
    "removes contrast CSS classes when default contrast " + "is selected",
    async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByText("Set High Contrast"));
      expect(document.documentElement.classList).toContain(
        "pf-v6-theme-high-contrast",
      );

      await user.click(screen.getByText("Set Default Contrast"));
      expect(document.documentElement.classList).not.toContain(
        "pf-v6-theme-high-contrast",
      );
      expect(document.documentElement.classList).not.toContain(
        "pf-v6-theme-glass",
      );
    },
  );

  it(
    "applies dark when system color scheme is selected and " +
      "media query matches",
    () => {
      let darkMatches = true;
      const listeners: Array<(e: { matches: boolean }) => void> = [];

      // Override matchMedia to simulate a dark system preference.
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string): MediaQueryList => ({
          matches: query === "(prefers-color-scheme: dark)" && darkMatches,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: (_: string, cb: EventListener) => {
            if (query === "(prefers-color-scheme: dark)") {
              listeners.push(
                cb as unknown as (e: { matches: boolean }) => void,
              );
            }
          },
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      // The default is already "system", and our mock says dark matches.
      expect(document.documentElement.classList).toContain("pf-v6-theme-dark");

      // Simulate the system switching to light by updating the mock's
      // return value before triggering the listener, since
      // applyColorScheme re-queries window.matchMedia.
      darkMatches = false;
      act(() => {
        for (const listener of listeners) {
          listener({ matches: false });
        }
      });

      expect(document.documentElement.classList).not.toContain(
        "pf-v6-theme-dark",
      );
    },
  );

  it(
    "applies high-contrast when system contrast mode is selected " +
      "and media query matches",
    async () => {
      const listeners: Array<(e: { matches: boolean }) => void> = [];

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string): MediaQueryList => ({
          matches: query === "(prefers-contrast: more)",
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: (_: string, cb: EventListener) => {
            if (query === "(prefers-contrast: more)") {
              listeners.push(
                cb as unknown as (e: { matches: boolean }) => void,
              );
            }
          },
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      // The default contrast mode is "system", and our mock says
      // high contrast is active.
      expect(document.documentElement.classList).toContain(
        "pf-v6-theme-high-contrast",
      );
    },
  );

  it("cleans up CSS classes on unmount", () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        themeMode: ThemeMode.PROJECT_FELT,
        colorScheme: ColorScheme.DARK,
        contrastMode: ContrastMode.DEFAULT,
      }),
    );

    const { unmount } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList).toContain("pf-v6-theme-dark");
    expect(document.documentElement.classList).toContain("pf-v6-theme-felt");

    unmount();

    expect(document.documentElement.classList).not.toContain(
      "pf-v6-theme-dark",
    );
    expect(document.documentElement.classList).not.toContain(
      "pf-v6-theme-felt",
    );
  });

  it(
    "logs an error but does not crash when local storage " + "setItem throws",
    async () => {
      const user = userEvent.setup();

      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>,
      );

      // Changing a preference should not crash.
      await user.click(screen.getByText("Set Dark"));

      expect(screen.getByTestId("colorScheme").textContent).toBe(
        ColorScheme.DARK,
      );

      setItemSpy.mockRestore();
    },
  );
});

describe("useThemeContext", () => {
  it("throws when used outside ThemeProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "Context useThemeContext is not defined",
    );

    consoleError.mockRestore();
  });
});
