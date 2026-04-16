import { type JSX, Show } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./styles.module.css";

export interface EditButtonWrapperProps {
  visible?: boolean;
  children: JSX.Element;
}

export function EditButtonWrapper(props: EditButtonWrapperProps) {
  return (
    <div
      class={cn(
        styles.wrapper,
        (props.visible ?? false) && styles.visible,
      )}
    >
      {props.children}
    </div>
  );
}
