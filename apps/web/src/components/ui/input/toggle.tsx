import { createEffect } from "solid-js";

import { springTransform } from "~/lib/motion";
import { cn } from "~/lib/utils";

import styles from "./toggle.module.css";

export function Toggle(props: {
  value?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel: string;
  onChange?: (value: boolean) => void;
}) {
  let circle: HTMLSpanElement | undefined;

  createEffect(() => {
    const on = props.value ?? false;
    if (circle) void springTransform(circle, `translateX(${on ? 14 : 2}px)`);
  });

  return (
    <label
      aria-label={props.ariaLabel}
      class={cn(
        styles.track,
        props.value && styles.trackOn,
        props.disabled && styles.disabled,
      )}
    >
      <input
        id={props.id}
        type="checkbox"
        class={styles.input}
        checked={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange?.(event.currentTarget.checked)}
      />
      <span ref={(el) => (circle = el)} class={styles.circle} />
    </label>
  );
}
