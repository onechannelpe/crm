import { clsx } from "clsx";
import type { JSX } from "solid-js";

import styles from "./field.module.css";

type InputHintProps = JSX.HTMLAttributes<HTMLDivElement> & {
  danger?: boolean;
};

export function InputHint(props: InputHintProps) {
  return (
    <div
      {...props}
      class={clsx(
        styles.hintText,
        props.danger ? styles.hintTextDanger : undefined,
        props.class,
      )}
    />
  );
}
