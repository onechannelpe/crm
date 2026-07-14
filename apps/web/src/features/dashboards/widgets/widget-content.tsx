import { For, Show } from "solid-js";

import { BarList } from "../charts/bar-list";
import { LineChart } from "../charts/line-chart";
import type { DashboardWidget, MetricTone, StatRow } from "./dashboard-widget";

import styles from "./widget-content.module.css";

export function WidgetContent(props: { widget: DashboardWidget }) {
  const widget = props.widget;

  switch (widget.type) {
    case "metric":
      return (
        <MetricValue
          value={widget.value}
          tone={widget.tone}
          hint={widget.hint}
        />
      );
    case "line":
      return <LineChart points={widget.points} target={widget.target} />;
    case "bar":
      return <BarList rows={widget.rows} />;
    case "stat-rows":
      return <StatRows rows={widget.rows} />;
    default:
      return widget satisfies never;
  }
}

function MetricValue(props: {
  value: string;
  tone: MetricTone;
  hint?: string;
}) {
  return (
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
  );
}

function StatRows(props: { rows: StatRow[] }) {
  return (
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
  );
}
