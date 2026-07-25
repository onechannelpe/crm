import type { JSX } from "solid-js";

import { cn } from "~/shared/classnames";

import styles from "./field.module.css";

type InputLabelProps = Omit<
  JSX.LabelHTMLAttributes<HTMLLabelElement>,
  "for"
> & {
  for: string;
};

export function InputLabel(props: InputLabelProps) {
  return (
    <label for={props.for} class={cn(styles.label, props.class)}>
      {props.children}
    </label>
  );
}
