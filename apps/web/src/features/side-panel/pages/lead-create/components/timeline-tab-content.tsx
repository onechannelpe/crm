import Plus from "~/components/icons/plus";

import styles from "../page.module.css";

export function TimelineTabContent() {
  return (
    <div class={styles.timelineSection}>
      <div class={styles.timelineMonth}>April 2026</div>
      <div class={styles.timelineEntry}>
        <div class={styles.timelineIcon}>
          <Plus size={12} />
        </div>
        <div class={styles.timelineBody}>
          <div class={styles.timelineTitle}>was created by You</div>
          <div class={styles.timelineMeta}>24 minutes ago</div>
        </div>
      </div>
    </div>
  );
}
