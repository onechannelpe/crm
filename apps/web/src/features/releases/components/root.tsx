import type { JSX } from "solid-js";

import styles from "./release-notes.module.css";

type RootProps = {
  children: JSX.Element;
  titleMuted: string;
  titleBold: string;
};

export function Root(props: RootProps) {
  return (
    <section class={styles.root} aria-label="Releases">
      <header class={styles.title}>
        <span class={styles.titleMuted}>{props.titleMuted}</span>
        <span class={styles.titleBold}>{props.titleBold}</span>
      </header>
      {props.children}
    </section>
  );
}

export function EmptyMessage(props: { children: JSX.Element }) {
  return <p class={styles.empty}>{props.children}</p>;
}
