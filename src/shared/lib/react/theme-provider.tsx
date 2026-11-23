"use client";

import { createContext, useContext } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light" });

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Light only for now. globals.css has no `.dark` token block, so following the
 * OS preference used to flip just the `dark:` utilities and toasts — half a
 * dark UI. Add the dark palette first, then bring back the preference here
 * (set the class before hydration to avoid a flash).
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  return <ThemeContext value={{ theme: defaultTheme }}>{children}</ThemeContext>;
}
