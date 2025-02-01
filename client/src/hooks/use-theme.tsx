import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SelectUserSettings } from "@db/schema";

type ThemeContextType = {
  theme: string;
  appearance: "light" | "dark" | "system";
  animationsEnabled: boolean;
  animationSpeed: number;
  sidebarCollapsed: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "blue",
  appearance: "light",
  animationsEnabled: true,
  animationSpeed: 1,
  sidebarCollapsed: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery<SelectUserSettings>({
    queryKey: ["/api/user/settings"],
  });

  useEffect(() => {
    if (!settings) return;

    // Aplicar tema
    document.documentElement.setAttribute("data-theme", settings.theme);

    // Aplicar modo oscuro/claro
    if (settings.appearance === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      document.documentElement.classList.toggle("dark", settings.appearance === "dark");
    }

    // Aplicar velocidad de animaciones
    document.documentElement.style.setProperty(
      "--animation-speed",
      `${settings.animationSpeed}s`
    );

    // Desactivar animaciones si es necesario
    document.documentElement.classList.toggle(
      "no-animations",
      !settings.animationsEnabled
    );
  }, [settings]);

  return (
    <ThemeContext.Provider
      value={{
        theme: settings?.theme ?? "blue",
        appearance: settings?.appearance ?? "light",
        animationsEnabled: settings?.animationsEnabled ?? true,
        animationSpeed: settings?.animationSpeed ?? 1,
        sidebarCollapsed: settings?.sidebarCollapsed ?? false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}