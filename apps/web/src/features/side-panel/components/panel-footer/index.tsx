import { splitProps, type JSX, type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function PanelFooter(props: ParentProps) {
  return <footer class={styles.footer}>{props.children}</footer>;
}

export function FooterButtonSecondary(
  props: ParentProps & JSX.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const [local, buttonProps] = splitProps(props, ["children", "class"]);

  return (
    <button
      type="button"
      class={`${styles.footerButtonSecondary}${local.class ? ` ${local.class}` : ""}`}
      {...buttonProps}
    >
      {local.children}
    </button>
  );
}

export function FooterButtonPrimary(
  props: ParentProps & JSX.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const [local, buttonProps] = splitProps(props, ["children", "class"]);

  return (
    <button
      type="button"
      class={`${styles.footerButtonPrimary}${local.class ? ` ${local.class}` : ""}`}
      {...buttonProps}
    >
      {local.children}
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
