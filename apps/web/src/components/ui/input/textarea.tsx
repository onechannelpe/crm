import { createUniqueId, type JSX, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./field.module.css";

export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea(props: TextareaProps) {
  const [local, others] = splitProps(props, ["label", "error", "class", "id"]);
  const textareaId = local.id || createUniqueId();

  return (
    <div class={styles.field}>
      {local.label && (
        <label for={textareaId} class={styles.label}>
          {local.label}
          {props.required && <span class={styles.required}>*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        class={cn(
          styles.textareaControl,
          local.error ? styles.errorControl : undefined,
          local.class,
        )}
        {...others}
      />
      {local.error && <p class={styles.errorText}>{local.error}</p>}
    </div>
  );
}
