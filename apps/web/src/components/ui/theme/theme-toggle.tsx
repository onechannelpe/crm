import { createSignal, onMount } from "solid-js";

import {
  applyThemeMode,
  getThemeMode,
  saveThemeMode,
  type ThemeMode,
} from "./theme-mode";

export function ThemeToggle(props: { class?: string }) {
  const [theme, setTheme] = createSignal<ThemeMode>("light");

  onMount(() => setTheme(getThemeMode()));

  const toggle = () => {
    const next = theme() === "light" ? "dark" : "light";
    setTheme(next);
    applyThemeMode(next);
    saveThemeMode(next);
  };

  return (
    <button
      type="button"
      class={props.class}
      onClick={toggle}
      aria-label={
        theme() === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"
      }
    >
      {theme() === "light" ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
