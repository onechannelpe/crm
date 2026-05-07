import type { JSX } from "solid-js";

import styles from "./styles/layout.module.css";

type UpdatesListProps = {
  children: JSX.Element;
  titleMuted: string;
  titleBold: string;
};

export function UpdatesList(props: UpdatesListProps) {
  return (
    <section class={styles.root} aria-label="Updates">
      <header class={styles.title}>
        <span class={styles.titleMuted}>{props.titleMuted}</span>
        <span class={styles.titleBold}>{props.titleBold}</span>
      </header>
      {props.children}
    </section>
  );
}

export function UpdatesEmptyMessage(props: { children: JSX.Element }) {
  return <p class={styles.empty}>{props.children}</p>;
}
