import { Badge } from "~/components/ui/display/badge";

import styles from "./last-used-pill.module.css";

export function LastUsedPill() {
  return (
    <span class={styles.container} aria-label="Último método usado">
      <Badge variant="info" class={styles.pill}>
        Último
      </Badge>
    </span>
  );
}
