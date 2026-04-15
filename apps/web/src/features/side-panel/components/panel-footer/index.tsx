import { type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function PanelFooter(props: ParentProps) {
  return <footer class={styles.footer}>{props.children}</footer>;
}

export function FooterButtonSecondary(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button
      type="button"
      class={styles.footerButtonSecondary}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function FooterButtonPrimary(
  props: ParentProps & { onClick?: () => void },
) {
  return (
    <button
      type="button"
      class={styles.footerButtonPrimary}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function FooterIcon(props: ParentProps) {
  return <span class={styles.footerIcon}>{props.children}</span>;
}

export function FooterLabel(props: ParentProps) {
  return <span class={styles.footerLabel}>{props.children}</span>;
}

export function FooterDots() {
  return <span class={styles.footerDots}>...</span>;
}

export function FooterShortcut(props: ParentProps) {
  return <span class={styles.footerShortcut}>{props.children}</span>;
}
