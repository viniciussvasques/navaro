"use client";

import React, { createContext, useContext, useEffect } from "react";
import { getThemeFromCategory, type EstablishmentCategory } from "@/lib/theme";

type ThemeContextValue = {
  category: EstablishmentCategory | null;
  setCategory: (cat: EstablishmentCategory | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  category: null,
  setCategory: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [category, setCategory] = React.useState<EstablishmentCategory | null>(null);

  useEffect(() => {
    const theme = getThemeFromCategory(category ?? "default");
    document.documentElement.setAttribute("data-theme", theme);
  }, [category]);

  return (
    <ThemeContext.Provider value={{ category, setCategory }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
