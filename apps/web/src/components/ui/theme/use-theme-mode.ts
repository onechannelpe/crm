import { createSignal, onMount } from "solid-js";

import {
  applyThemeMode,
  getThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "./theme-mode";

export function useThemeMode() {
  const [theme, setThemeSignal] = createSignal<ThemeMode>("light");

  onMount(() => setThemeSignal(getThemeMode()));

  const setTheme = (next: ThemeMode) => {
    setThemeSignal(next);
    applyThemeMode(next);
    saveThemeMode(next);
  };

  return { theme, setTheme } as const;
}
