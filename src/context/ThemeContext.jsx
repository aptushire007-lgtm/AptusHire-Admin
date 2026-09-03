import { createContext, useContext, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "aptushire_theme:v1";

const ThemeContext = createContext({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
      return "light";
    } catch {
      return "light";
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  useEffect(() => {
    function applyTheme() {
      let resolved = theme;
      if (theme === "system") {
        const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
        resolved = darkMq.matches ? "dark" : "light";
      }
      setResolvedTheme(resolved);

      const root = document.documentElement;
      if (resolved === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }

    applyTheme();

    if (theme === "system") {
      const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      darkMq.addEventListener("change", handler);
      return () => darkMq.removeEventListener("change", handler);
    }
  }, [theme]);

  function setTheme(newTheme) {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.error("Failed to persist theme", err);
    }
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
