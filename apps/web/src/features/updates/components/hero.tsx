import styles from "./styles/layout.module.css";

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
