import { For } from "solid-js";

import styles from "./security-enrollment-panel.module.css";

interface RecoveryCodesPanelProps {
  title: string;
  description: string;
  codes: string[];
}

export function RecoveryCodesPanel(props: RecoveryCodesPanelProps) {
  return (
    <div class={styles.recovery}>
      <div class={styles.recoveryHeader}>
        <h3 class={styles.recoveryTitle}>{props.title}</h3>
        <p class={styles.recoveryDescription}>{props.description}</p>
      </div>
      <div class={styles.recoveryList}>
        <For each={props.codes}>
          {(code) => <div class={styles.mono}>{code}</div>}
        </For>
      </div>
    </div>
  );
}
