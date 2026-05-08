import styles from "./styles/layout.module.css";
import { ButtonLink } from "~/components/ui/input/button-link";
import { UpdatesHeroVisual } from "./hero-visual";

export function UpdatesHero(props: {
  titleMuted: string;
  titleBold: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
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
      <div class={styles.heroCta}>
        <ButtonLink href={props.ctaHref} size="lg" variant="outline">
          {props.ctaLabel}
        </ButtonLink>
      </div>
      <UpdatesHeroVisual />
    </section>
  );
}
