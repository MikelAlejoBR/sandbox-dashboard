import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ColorScheme,
  ContrastMode,
  ThemeMode,
  type ThemePreferences,
} from "../types/main";
import logger from "../utils/logger";
import { ThemeContext } from "./ThemeContext";

/**
 * The key used to push and pull the theme preferences from local storage.
 */
const LS_THEME_PREFERENCES_KEY = "theme-preferences";

/**
 * A map containing the CSS classes associated to the theme mode.
 */
const themeModeClasses: Record<ThemeMode, string | undefined> = {
  [ThemeMode.DEFAULT]: undefined,
  [ThemeMode.PROJECT_FELT]: "pf-v6-theme-felt",
};

/**
 * A map containing the CSS classes associated to the color scheme.
 */
const colorSchemeClasses: Record<ColorScheme, string | undefined> = {
  [ColorScheme.SYSTEM]: undefined,
  [ColorScheme.LIGHT]: undefined,
  [ColorScheme.DARK]: "pf-v6-theme-dark",
};

/**
 * A map containing the CSS classes associated to the contrast mode.
 */
const contrastModeClasses: Record<ContrastMode, string | undefined> = {
  [ContrastMode.SYSTEM]: undefined,
  [ContrastMode.DEFAULT]: undefined,
  [ContrastMode.HIGH_CONTRAST]: "pf-v6-theme-high-contrast",
  [ContrastMode.GLASS]: "pf-v6-theme-glass",
};

/**
 * A helper constant containing all the theme's classes, used to remove them
 * before applying the specific user preferences' classes to the root element.
 */
const ALL_THEME_CLASSES = [
  "pf-v6-theme-felt",
  "pf-v6-theme-dark",
  "pf-v6-theme-high-contrast",
  "pf-v6-theme-glass",
] as const;

/**
 * The default theme preferences used when nothing is stored in local
 * storage, or when the stored values are invalid.
 */
const DEFAULT_PREFERENCES: ThemePreferences = {
  themeMode: ThemeMode.DEFAULT,
  colorScheme: ColorScheme.SYSTEM,
  contrastMode: ContrastMode.SYSTEM,
};

/**
 * The set of valid enum values for each theme preference, used to
 * validate local storage data before applying it.
 */
const VALID_THEME_MODES = new Set<string>(Object.values(ThemeMode));
const VALID_COLOR_SCHEMES = new Set<string>(Object.values(ColorScheme));
const VALID_CONTRAST_MODES = new Set<string>(Object.values(ContrastMode));

/**
 * Fetches the theme preferences from local storage. Each stored field
 * is validated against the corresponding enum, and only accepted when
 * it is a known member. Missing or invalid fields fall back to the
 * defaults.
 * @returns the theme preferences from local storage, or the defaults
 * if the local storage is unavailable, empty, or contains invalid
 * values.
 */
function getInitialPreferences(): ThemePreferences {
  try {
    const stored = localStorage.getItem(LS_THEME_PREFERENCES_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        return {
          themeMode: VALID_THEME_MODES.has(obj.themeMode as string)
            ? (obj.themeMode as ThemeMode)
            : DEFAULT_PREFERENCES.themeMode,
          colorScheme: VALID_COLOR_SCHEMES.has(obj.colorScheme as string)
            ? (obj.colorScheme as ColorScheme)
            : DEFAULT_PREFERENCES.colorScheme,
          contrastMode: VALID_CONTRAST_MODES.has(obj.contrastMode as string)
            ? (obj.contrastMode as ContrastMode)
            : DEFAULT_PREFERENCES.contrastMode,
        };
      }
    }
  } catch (error) {
    logger.error("Unable to read theme preferences from local storage:", error);
  }

  return { ...DEFAULT_PREFERENCES };
}

/**
 * A provider that uses local storage to persist the theme preferences
 * selected by the user. It also monitors the system settings, if that color
 * scheme or contrast mode is chosen, for changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreferences, setThemePreferences] = useState<ThemePreferences>(
    getInitialPreferences,
  );

  /**
   * Changes the general mode of theme.
   */
  const changeThemeMode = useCallback((themeMode: ThemeMode) => {
    setThemePreferences((prev) => ({ ...prev, themeMode }));
  }, []);

  /**
   * Changes the color scheme of the theme.
   */
  const changeColorScheme = useCallback((colorScheme: ColorScheme) => {
    setThemePreferences((prev) => ({ ...prev, colorScheme }));
  }, []);

  /**
   * Changes the contrast mode of the theme.
   */
  const changeContrastMode = useCallback((contrastMode: ContrastMode) => {
    setThemePreferences((prev) => ({ ...prev, contrastMode }));
  }, []);

  /**
   * Monitors changes in the theme preferences to then update the CSS classes
   * of the root "html" element, which is what Patternfly uses to activate the
   * different theme settings.
   */
  useEffect(() => {
    // Start by cleaning up the root element of all the classes.
    const rootElementClasses = document.documentElement.classList;
    rootElementClasses.remove(...ALL_THEME_CLASSES);

    // Determine the theme mode.
    const tmClass = themeModeClasses[themePreferences.themeMode];
    if (tmClass) {
      rootElementClasses.add(tmClass);
    }

    /**
     * Applies the selected color scheme. When the color scheme is "system",
     * it checks the media query to decide which theme to apply.
     */
    const applyColorScheme = () => {
      rootElementClasses.remove("pf-v6-theme-dark");

      if (themePreferences.colorScheme === ColorScheme.SYSTEM) {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          rootElementClasses.add("pf-v6-theme-dark");
        }
      } else {
        const csClass = colorSchemeClasses[themePreferences.colorScheme];
        if (csClass) {
          rootElementClasses.add(csClass);
        }
      }
    };

    /**
     * Applies the selected contrast mode. When the contrast mode is "system",
     * it checks the media query to decide which theme to apply.
     */
    const applyContrastMode = () => {
      rootElementClasses.remove(
        "pf-v6-theme-glass",
        "pf-v6-theme-high-contrast",
      );

      if (themePreferences.contrastMode === ContrastMode.SYSTEM) {
        if (window.matchMedia("(prefers-contrast: more)").matches) {
          rootElementClasses.add("pf-v6-theme-high-contrast");
        }
      } else {
        const contrastClass =
          contrastModeClasses[themePreferences.contrastMode];
        if (contrastClass) {
          rootElementClasses.add(contrastClass);
        }
      }
    };

    applyColorScheme();
    applyContrastMode();

    // Set up a media query for the color scheme if the user selected the
    // "system" color scheme.
    let csMediaQuery: MediaQueryList | undefined;
    if (themePreferences.colorScheme === ColorScheme.SYSTEM) {
      csMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      csMediaQuery.addEventListener("change", applyColorScheme);
    }

    // Set up a media query for the contrast mode if the user selected the
    // "system" contrast mode.
    let contrastMediaQuery: MediaQueryList | undefined;
    if (themePreferences.contrastMode === ContrastMode.SYSTEM) {
      contrastMediaQuery = window.matchMedia("(prefers-contrast: more)");
      contrastMediaQuery.addEventListener("change", applyContrastMode);
    }

    // Attempt saving the preferences in the local storage.
    try {
      localStorage.setItem(
        LS_THEME_PREFERENCES_KEY,
        JSON.stringify(themePreferences),
      );
    } catch (error) {
      // Log the error, but don't do anything else. The preferences will be
      // saved in memory until the user navigates away.
      logger.error(
        "Unable to save theme preferences to local storage: ",
        error,
      );
    }

    // Clean any theme classes from the root element and the media queries
    // on unmount.
    return () => {
      rootElementClasses.remove(...ALL_THEME_CLASSES);
      csMediaQuery?.removeEventListener("change", applyColorScheme);
      contrastMediaQuery?.removeEventListener("change", applyContrastMode);
    };
  }, [themePreferences]);

  // Memoize the contents of the context to avoid rerenders on any state or
  // function changes.
  const contextValue = useMemo(
    () => ({
      changeColorScheme,
      changeContrastMode,
      changeThemeMode,
      themePreferences,
    }),
    [changeColorScheme, changeContrastMode, changeThemeMode, themePreferences],
  );
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
