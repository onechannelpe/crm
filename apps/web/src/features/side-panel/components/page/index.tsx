import { Show, type JSX, type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function SidePanelPage(props: ParentProps<{ footer?: JSX.Element }>) {
  return (
    <div class={styles.page}>
      <div class={styles.scroll}>{props.children}</div>
      <Show when={props.footer}>{props.footer}</Show>
    </div>
  );
}
