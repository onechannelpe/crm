import type { ParentProps } from "solid-js";

import { PagePanel } from "./page-panel";

import styles from "./page-body.module.css";

export function PageBody(props: ParentProps) {
  return (
    <div class={styles.body}>
      <div class={styles.leftContainer}>
        <PagePanel>{props.children}</PagePanel>
      </div>
    </div>
  );
}
