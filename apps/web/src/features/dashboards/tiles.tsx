import { For, Show } from "solid-js";

import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetGridItem,
  type WidgetSpan,
} from "~/features/widgets/widget-layout";

import { BarList, type BarRow } from "./charts/bar-list";
import { LineChart, type LinePoint } from "./charts/line-chart";

import styles from "./tiles.module.css";

export type MetricTone = "default" | "positive" | "warning";

export interface StatRow {
  label: string;
  value: string;
  alert: boolean;
}

export function MetricTile(props: {
  title: string;
  span: WidgetSpan;
  value: string;
  tone: MetricTone;
  hint?: string;
}) {
  return (
    <WidgetGridItem span={props.span}>
      <WidgetCardShell title={props.title}>
        <div class={styles.metric}>
          <span
            class={styles.metricValue}
            classList={{
              [styles.positive]: props.tone === "positive",
              [styles.warning]: props.tone === "warning",
            }}
          >
            {props.value}
          </span>
          <Show when={props.hint}>
            <span class={styles.metricHint}>{props.hint}</span>
          </Show>
        </div>
      </WidgetCardShell>
    </WidgetGridItem>
  );
}

export function LineTile(props: {
  title: string;
  span: WidgetSpan;
  points: LinePoint[];
  target: number | null;
}) {
  return (
    <WidgetGridItem span={props.span}>
      <WidgetCardShell
        title={props.title}
        status={props.points.length ? "ready" : "empty"}
      >
        <LineChart points={props.points} target={props.target} />
      </WidgetCardShell>
    </WidgetGridItem>
  );
}

export function BarTile(props: {
  title: string;
  span: WidgetSpan;
  rows: BarRow[];
}) {
  return (
    <WidgetGridItem span={props.span}>
      <WidgetCardShell
        title={props.title}
        status={props.rows.length ? "ready" : "empty"}
      >
        <BarList rows={props.rows} />
      </WidgetCardShell>
    </WidgetGridItem>
  );
}

export function StatRowsTile(props: {
  title: string;
  span: WidgetSpan;
  rows: StatRow[];
}) {
  return (
    <WidgetGridItem span={props.span}>
      <WidgetCardShell title={props.title}>
        <div class={styles.statRows}>
          <For each={props.rows}>
            {(row) => (
              <div class={styles.statRow}>
                <span class={styles.statLabel}>{row.label}</span>
                <span
                  class={styles.statValue}
                  classList={{ [styles.statAlert]: row.alert }}
                >
                  {row.value}
                </span>
              </div>
            )}
          </For>
        </div>
      </WidgetCardShell>
    </WidgetGridItem>
  );
}
