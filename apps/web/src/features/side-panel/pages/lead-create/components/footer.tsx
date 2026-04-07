import BrowserMaximize from "~/components/icons/browser-maximize";

import styles from "../page.module.css";

type FooterProps = {
  onOpen: () => void;
};

export function Footer(props: FooterProps) {
  return (
    <footer class={styles.footer}>
      <button type="button" class={styles.footerButtonSecondary}>
        <span class={styles.footerLabel}>Options</span>
        <span class={styles.footerDots}>...</span>
        <span class={styles.footerShortcut}>Ctrl O</span>
      </button>
      <button
        type="button"
        class={styles.footerButtonPrimary}
        onClick={props.onOpen}
      >
        <span class={styles.footerIcon}>
          <BrowserMaximize size={14} />
        </span>
        <span class={styles.footerLabel}>Open</span>
        <span class={styles.footerShortcut}>Ctrl ⏎</span>
      </button>
    </footer>
  );
}
