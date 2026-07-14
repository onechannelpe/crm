import { For } from "solid-js";

import { formatSoles } from "../format";

import styles from "./bar-list.module.css";

export interface BarRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  target?: number | null;
}

interface BarListProps {
  rows: BarRow[];
}

// Horizontal magnitude bars (one measure), rounded data-end anchored at the
// baseline. A dashed tick marks each row's projected target on the same axis, so
// realized-vs-target reads without a second scale. Values are always visible
// (touch-first, no hover dependency).
export function BarList(props: BarListProps) {
  const max = () =>
    Math.max(
      1,
      ...props.rows.map((row) => Math.max(row.value, row.target ?? 0)),
    );

  return (
    <div class={styles.list}>
      <For each={props.rows}>
        {(row) => {
          const width = () => `${(row.value / max()) * 100}%`;
          const targetLeft = () =>
            row.target != null ? `${(row.target / max()) * 100}%` : null;
          const hitsTarget = () =>
            row.target != null && row.value >= row.target;
          return (
            <div class={styles.row}>
              <div class={styles.head}>
                <span class={styles.label} title={row.label}>
                  {row.label}
                </span>
                <span class={styles.value}>{formatSoles(row.value)}</span>
              </div>
              <div class={styles.track}>
                <div
                  class={styles.fill}
                  classList={{ [styles.fillHit]: hitsTarget() }}
                  style={{ width: width() }}
                />
                {targetLeft() != null && (
                  <div class={styles.target} style={{ left: targetLeft()! }} />
                )}
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
