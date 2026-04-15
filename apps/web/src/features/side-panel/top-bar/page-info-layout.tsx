import type { JSX } from "solid-js";
import { Show } from "solid-js";

import styles from "./page-info-layout.module.css";

type PageInfoLayoutProps = {
  icon?: JSX.Element;
  iconColor?: string;
  title: JSX.Element;
  label?: string;
};

export function PageInfoLayout(props: PageInfoLayoutProps) {
  return (
    <div class={styles.container}>
      <Show when={props.icon}>
        <div class={styles.iconWrapper} style={{ color: props.iconColor }}>
          {props.icon}
        </div>
      </Show>
      <div class={styles.textContainer}>
        <div class={styles.titleWrapper}>{props.title}</div>
        <Show when={props.label}>
          <span class={styles.label}>{props.label}</span>
        </Show>
      </div>
    </div>
  );
}
