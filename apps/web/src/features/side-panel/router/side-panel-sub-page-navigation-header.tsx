import ChevronLeft from "~/components/icons/chevron-left";

import styles from "./side-panel-sub-page-navigation-header.module.css";

type SidePanelSubPageNavigationHeaderProps = {
  title: string;
  onBack: () => void;
};

export function SidePanelSubPageNavigationHeader(
  props: SidePanelSubPageNavigationHeaderProps,
) {
  return (
    <div class={styles.header}>
      <button
        type="button"
        class={styles.backButton}
        onClick={props.onBack}
        aria-label="Go back"
      >
        <ChevronLeft size={16} />
      </button>
      <span class={styles.title}>{props.title}</span>
    </div>
  );
}
