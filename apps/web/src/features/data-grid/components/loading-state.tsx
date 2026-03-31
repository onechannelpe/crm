import { Loading } from "~/components/feedback/loading";

import styles from "../styles/data-grid.module.css";

export function DataGridLoadingState() {
  return (
    <div class={styles.loadingState}>
      <div class={styles.loadingStateContent}>
        <Loading size="lg" />
        <p class={styles.loadingStateLabel}>Loading records</p>
      </div>
    </div>
  );
}
