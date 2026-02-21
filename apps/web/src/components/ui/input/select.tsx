import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select(props: SelectProps) {
  const [local, others] = splitProps(props, [
    "label",
    "error",
    "class",
    "id",
    "children",
  ]);
  const selectId = local.id || createUniqueId();

  return (
    <div class={styles.field}>
      {local.label && (
        <label for={selectId} class={styles.label}>
          {local.label}
          {props.required && <span class={styles.required}>*</span>}
        </label>
      )}
      <select
        id={selectId}
        class={cn(
          styles.control,
          local.error ? styles.errorControl : undefined,
          local.class,
        )}
        {...others}
      >
        {local.children}
      </select>
      {local.error && <p class={styles.errorText}>{local.error}</p>}
    </div>
  );
}
