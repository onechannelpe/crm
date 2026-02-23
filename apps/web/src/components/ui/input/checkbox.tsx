import { Show, type JSX, splitProps } from "solid-js";

import Check from "~/components/icons/check";
import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface CheckboxProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

export function Checkbox(props: CheckboxProps) {
  const [local, others] = splitProps(props, [
    "class",
    "label",
    "id",
    "checked",
  ]);

  return (
    <label class={styles.checkboxLabel}>
      <span class={styles.checkboxWrap}>
        <input
          type="checkbox"
          checked={local.checked}
          class={cn(styles.checkboxInput, local.class)}
          {...others}
        />
        <Show when={local.checked}>
          <Check class={styles.checkIcon} />
        </Show>
      </span>
      {local.label && <span class={styles.checkboxText}>{local.label}</span>}
    </label>
  );
}
