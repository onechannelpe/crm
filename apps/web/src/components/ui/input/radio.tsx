import { createEffect, type JSX, type ParentProps } from "solid-js";

import { springTransform } from "~/lib/motion";
import { cn } from "~/lib/utils";

import styles from "./radio.module.css";

export function RadioGroup(props: ParentProps) {
  return <div class={styles.group}>{props.children}</div>;
}

export function Radio(props: {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  name?: string;
  value?: string;
  onChange?: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event>;
}) {
  let input: HTMLInputElement | undefined;

  createEffect(() => {
    const checked = props.checked;
    if (input) void springTransform(input, `scale(${checked ? 1.05 : 0.95})`);
  });

  return (
    <label class={cn(styles.container, props.disabled && styles.disabled)}>
      <input
        ref={(el) => (input = el)}
        type="radio"
        class={styles.input}
        name={props.name}
        value={props.value ?? props.label}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onChange}
      />
      {props.label && <span class={styles.label}>{props.label}</span>}
    </label>
  );
}
