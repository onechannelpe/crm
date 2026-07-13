import Moon from "~/components/icons/moon";
import Sun from "~/components/icons/sun";

import { useTheme } from "./theme-context";

export function ThemeToggle(props: { class?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      class={props.class}
      onClick={toggleTheme}
      aria-label={
        theme() === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"
      }
    >
      {theme() === "light" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
