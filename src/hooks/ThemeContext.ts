import { createContext, useContext } from "react";

import {
  ColorScheme,
  ContrastMode,
  type ThemeMode,
  type ThemePreferences,
} from "../types/main";

export interface ThemeContextType {
  /**
   * Changes the color scheme of the theme.
   * @param colorScheme the color scheme to apply for the theme.
   */
  changeColorScheme: (colorScheme: ColorScheme) => void;

  /**
   * Changes the contrast mode of the theme.
   * @param contrastMode the contrast mode to apply for the theme.
   */
  changeContrastMode: (contrastMode: ContrastMode) => void;

  /**
   * Changes the theme mode of the theme.
   * @param themeMode the theme mode to apply for the theme.
   */
  changeThemeMode: (themeMode: ThemeMode) => void;

  /**
   * The current theme preferences that are applied.
   */
  themePreferences: ThemePreferences;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("Context useThemeContext is not defined");
  }
  return context;
};
