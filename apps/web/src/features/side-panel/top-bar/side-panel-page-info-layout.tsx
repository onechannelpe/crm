import type { JSX } from "solid-js";
import { Show } from "solid-js";

import styles from "./side-panel-page-info-layout.module.css";

type SidePanelPageInfoLayoutProps = {
  icon?: JSX.Element;
  title: JSX.Element;
  label?: string;
};

export function SidePanelPageInfoLayout(props: SidePanelPageInfoLayoutProps) {
  return (
    <div class={styles.container}>
      <Show when={props.icon}>
        <div class={styles.iconWrapper}>{props.icon}</div>
      </Show>
      <div class={styles.textContainer}>
        <span class={styles.titleWrapper}>{props.title}</span>
        <Show when={props.label}>
          <span class={styles.label}>{props.label}</span>
        </Show>
      </div>
    </div>
  );
}
