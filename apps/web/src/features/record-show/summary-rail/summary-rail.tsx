import { For } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { RecordSummaryCard } from "~/features/record-show/summary-card/record-summary-card";
import {
  formatAmount,
  formatRate,
} from "~/features/workflow/presentation/format";

import styles from "./summary-rail.module.css";

export function SummaryRail(props: { data: LeadDetailView }) {
  const profile = () => props.data.profile;
  const metrics = () => [
    { label: "GPV", value: formatAmount(profile().gpv) },
    { label: "Ticket", value: formatAmount(profile().ticket) },
    { label: "Tasa débito", value: formatRate(profile().currentDebitRate) },
    { label: "Tasa crédito", value: formatRate(profile().currentCreditRate) },
  ];

  return (
    <div class={styles.rail}>
      <RecordSummaryCard lead={props.data.lead} />
      <div class={styles.body}>
        <dl class={styles.metrics}>
          <For each={metrics()}>
            {(metric) => (
              <div class={styles.metric}>
                <dt class={styles.metricLabel}>{metric.label}</dt>
                <dd class={styles.metricValue}>{metric.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </div>
    </div>
  );
}
