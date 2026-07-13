import { Loading } from "~/components/feedback/loading/screen";

import styles from "../styles/table.module.css";

export function DataGridLoadingState() {
  return (
    <div class={styles.loadingState} role="row">
      <div class={styles.loadingStateContent} role="gridcell">
        <Loading size="lg" />
        <p class={styles.loadingStateLabel}>Cargando registros</p>
      </div>
    </div>
  );
}
