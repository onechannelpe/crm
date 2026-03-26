import Building2 from "~/components/icons/building-2";
import Plus from "~/components/icons/plus";

import styles from "./styles.module.css";

export function EmptyState(props: { onAddNew: () => void }) {
  return (
    <div class={styles.emptyState} role="rowgroup">
      <div class={styles.emptyIcon}>
        <Building2 size={18} />
      </div>
      <div class={styles.emptyTitle}>No records in this view</div>
      <div class={styles.emptyDescription}>
        Start with an empty row and register only the RUC.
      </div>
      <button type="button" class={styles.emptyAction} onClick={props.onAddNew}>
        <Plus size={14} />
        Add New
      </button>
    </div>
  );
}
