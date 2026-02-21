import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface FileInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function FileInput(props: FileInputProps) {
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
        type="file"
        class={cn(
          styles.fileControl,
          local.error ? styles.errorControl : undefined,
          local.class,
        )}
        {...others}
      />
      {local.error && <p class={styles.errorText}>{local.error}</p>}
    </div>
  );
}
