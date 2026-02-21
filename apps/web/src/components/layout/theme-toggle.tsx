import { createSignal, onMount } from "solid-js";

import { Button } from "~/components/ui/input/button";
import {
  applyThemeMode,
  initializeThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "~/components/ui/theme/theme-mode";

export function ThemeToggle() {
  const [theme, setTheme] = createSignal<ThemeMode>("light");

  onMount(() => {
    setTheme(initializeThemeMode());
  });

  const handleToggle = () => {
    const nextTheme = theme() === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyThemeMode(nextTheme);
    saveThemeMode(nextTheme);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      class="h-8 px-2 text-xs font-medium"
      onClick={handleToggle}
      aria-label="Toggle theme"
      title={`Switch to ${theme() === "light" ? "dark" : "light"} mode`}
    >
      {theme() === "light" ? "Dark" : "Light"}
    </Button>
  );
}
