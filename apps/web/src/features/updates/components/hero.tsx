import { UpdatesHeroVisual } from "./hero-visual";

import styles from "./styles/layout.module.css";

export function UpdatesHero(props: {
  titleMuted: string;
  titleBold: string;
  body: string;
}) {
  return (
    <section class={styles.hero}>
      <div class={styles.heroBackdrop} aria-hidden="true" />
      <h1 class={styles.heroTitle}>
        <span class={styles.heroTitleMuted}>{props.titleMuted}</span>
        <br />
        <span class={styles.heroTitleBold}>{props.titleBold}</span>
      </h1>
      <p class={styles.heroBody}>{props.body}</p>
      <UpdatesHeroVisual />
    </section>
  );
}
