import { createEffect, onMount, type Accessor } from "solid-js";

export function useCssVariableEffect(
  cssVariableName: string,
  value: Accessor<string | number>,
) {
  onMount(() => {
    createEffect(() => {
      document.documentElement.style.setProperty(
        cssVariableName,
        String(value()),
      );
    });
  });
}
