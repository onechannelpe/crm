import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

type CardProps = ParentProps<{
  class?: string;
  fullWidth?: boolean;
}>;

export function Card(props: CardProps) {
  return (
    <div
      class={props.class}
      classList={{
        [styles.card]: true,
        [styles.cardFullWidth]: props.fullWidth,
      }}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: ParentProps<{ class?: string }>) {
  return (
    <div class={`${styles.cardHeader} ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}

export function CardContent(props: ParentProps<{ class?: string }>) {
  return (
    <div class={`${styles.cardContent} ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}

export function CardFooter(
  props: ParentProps<{ class?: string; divider?: boolean }>,
) {
  return (
    <div
      class={`${styles.cardFooter} ${props.class ?? ""}`}
      classList={{ [styles.cardFooterDividerless]: props.divider === false }}
    >
      {props.children}
    </div>
  );
}
