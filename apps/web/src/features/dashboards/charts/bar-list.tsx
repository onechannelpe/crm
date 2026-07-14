import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import { formatRatio, formatSoles } from "../format";

import styles from "./bar-list.module.css";

export interface BarRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  target?: number | null;
  // When the row stands for a record, it links to it. Twenty's answer to
  // "filter to one seller" is to open that seller, not to narrow the page.
  href?: string;
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
                <Show
                  when={row.href}
                  fallback={
                    <span class={styles.label} title={row.label}>
                      {row.label}
                    </span>
                  }
                >
                  {(href) => (
                    <A class={styles.labelLink} href={href()} title={row.label}>
                      {row.label}
                    </A>
                  )}
                </Show>
                <span class={styles.value}>{formatSoles(row.value)}</span>
                <Show when={row.target}>
                  {(target) => (
                    <span class={styles.ratio}>
                      {formatRatio(row.value, target())}
                    </span>
                  )}
                </Show>
              </div>
              <div class={styles.track}>
                <div
                  class={styles.fill}
                  classList={{ [styles.fillHit]: hitsTarget() }}
                  style={{ width: width() }}
                />
                <Show when={targetLeft()}>
                  {(left) => (
                    <div
                      class={styles.target}
                      style={{ left: left() }}
                      title={`Objetivo ${formatSoles(row.target ?? 0)}`}
                    />
                  )}
                </Show>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
