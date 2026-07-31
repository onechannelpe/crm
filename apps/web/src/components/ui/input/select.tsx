import { clsx } from "clsx";
import { createUniqueId, type JSX, splitProps } from "solid-js";

import { InputErrorHelper } from "./input-error-helper";
import { InputLabel } from "./input-label";

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
  const generatedId = createUniqueId();
  const selectId = () => local.id || generatedId;

  return (
    <div class={styles.field}>
      {local.label && (
        <InputLabel for={selectId()}>
          {local.label}
          {props.required && <span class={styles.required}>*</span>}
        </InputLabel>
      )}
      <select
        id={selectId()}
        class={clsx(
          styles.control,
          local.error ? styles.errorControl : undefined,
          local.class,
        )}
        {...others}
      >
        {local.children}
      </select>
      {local.error && <InputErrorHelper>{local.error}</InputErrorHelper>}
    </div>
  );
}
