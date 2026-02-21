import type { Component } from "solid-js";

import { Badge } from "~/components/ui/display/badge";

import styles from "./quota-display.module.css";

interface QuotaDisplayProps {
  used: number;
  total: number;
}

export const QuotaDisplay: Component<QuotaDisplayProps> = (props) => {
  const percentage = () =>
    props.total > 0 ? (props.used / props.total) * 100 : 0;
  const remaining = () => props.total - props.used;

  const variant = () => {
    const pct = percentage();
    if (pct >= 90) return "destructive" as const;
    if (pct >= 70) return "warning" as const;
    return "success" as const;
  };

  return (
    <div class={styles.root}>
      <div class={styles.head}>
        <span class={styles.label}>Daily quota</span>
        <Badge variant={variant()} class={styles.badge}>
          {props.used}/{props.total}
        </Badge>
      </div>
      <div class={styles.track}>
        <div class={styles.fill} style={{ width: `${percentage()}%` }} />
      </div>
      <p class={styles.meta}>
        {remaining()} leads remaining today
      </p>
    </div>
  );
};
