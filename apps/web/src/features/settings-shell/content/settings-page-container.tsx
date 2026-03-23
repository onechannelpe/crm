import type { ParentProps } from "solid-js";

import styles from "./settings-page-container.module.css";

export function SettingsPageContainer(props: ParentProps) {
  return (
    <div class={styles.scrollWrapper}>
      <div class={styles.container}>{props.children}</div>
    </div>
  );
}
