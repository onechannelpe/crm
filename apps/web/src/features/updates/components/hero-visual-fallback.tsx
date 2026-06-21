import styles from "./styles/layout.module.css";

export function UpdatesHeroVisualPlaceholder() {
  return <div class={styles.heroVisualPlaceholder} />;
}

export function UpdatesHeroVisualFallback() {
  return (
    <div aria-hidden="true" class={styles.heroVisual}>
      <UpdatesHeroVisualPlaceholder />
    </div>
  );
}
