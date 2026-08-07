import { Skeleton } from "~/components/ui/feedback/skeleton";

import styles from "./standard-shell-skeleton.module.css";

export function StandardShellSkeleton() {
  return (
    <div class={styles.root}>
      <Skeleton width="40%" height={16} />
      <Skeleton height={120} radius={8} />
      <Skeleton height={120} radius={8} />
    </div>
  );
}
