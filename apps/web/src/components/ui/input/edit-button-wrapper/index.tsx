import { type JSX } from "solid-js";

import { cn } from "~/shared/classnames";

import styles from "./styles.module.css";

export interface EditButtonWrapperProps {
  visible?: boolean;
  children: JSX.Element;
}

export function EditButtonWrapper(props: EditButtonWrapperProps) {
  return (
    <div class={cn(styles.wrapper, (props.visible ?? false) && styles.visible)}>
      {props.children}
    </div>
  );
}
