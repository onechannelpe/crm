import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, ["label", "error", "class", "id"]);
  const inputId = local.id || createUniqueId();

  return (
    <div class={styles.field}>
      {local.label && (
        <label for={inputId} class={styles.label}>
          {local.label}
          {props.required && <span class={styles.required}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        class={cn(
          styles.control,
          local.error ? styles.errorControl : undefined,
          local.class,
        )}
        {...others}
      />
      {local.error && <p class={styles.errorText}>{local.error}</p>}
    </div>
  );
}
