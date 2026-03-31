import { Loading } from "~/components/feedback/loading";

import styles from "../styles/data-grid.module.css";

export function DataGridLoadingState() {
  return (
    <div class={styles.loadingState}>
      <Loading />
    </div>
  );
}
