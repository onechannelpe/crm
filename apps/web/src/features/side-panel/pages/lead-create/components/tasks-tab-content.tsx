import Checkbox from "~/components/icons/checkbox";

import styles from "../page.module.css";

export function TasksTabContent() {
  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>Tasks</div>
      <div class={styles.timelineEntry}>
        <div class={styles.timelineIcon}>
          <Checkbox size={12} />
        </div>
        <div class={styles.timelineBody}>
          <div class={styles.timelineTitle}>No tasks yet</div>
          <div class={styles.timelineMeta}>
            This tab is ready for task details.
          </div>
        </div>
      </div>
    </div>
  );
}
