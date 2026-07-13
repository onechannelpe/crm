export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "crm-theme-mode";

function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!value || !isThemeMode(value)) return null;
  return value;
}

export function getThemeMode(): ThemeMode {
  return getStoredThemeMode() ?? "light";
}

export function applyThemeMode(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function saveThemeMode(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
