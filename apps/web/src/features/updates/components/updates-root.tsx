import type { JSX } from "solid-js";

import styles from "./updates-page.module.css";

type UpdatesRootProps = {
  children: JSX.Element;
  titleMuted: string;
  titleBold: string;
};

export function UpdatesRoot(props: UpdatesRootProps) {
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

export function UpdatesHero(props: {
  titleMuted: string;
  titleBold: string;
  body: string;
}) {
  return (
    <section class={styles.hero}>
      <h1 class={styles.heroTitle}>
        {props.titleMuted}
        <br />
        {props.titleBold}
      </h1>
      <p class={styles.heroBody}>{props.body}</p>
    </section>
  );
}

export function UpdatesDivider() {
  return <div class={styles.divider} aria-hidden />;
}
