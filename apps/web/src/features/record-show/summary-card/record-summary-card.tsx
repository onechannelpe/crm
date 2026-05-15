import { createMemo, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import type { LeadDetailLeadView } from "~/contracts/workflow/views";

import { formatPastRelativeDate } from "./format-relative-date";

import styles from "./record-summary-card.module.css";

type RecordSummaryCardProps = {
  lead: LeadDetailLeadView;
};

export function RecordSummaryCard(props: RecordSummaryCardProps) {
  const relativeDate = createMemo(() =>
    formatPastRelativeDate(props.lead.createdAt),
  );

  return (
    <div class={styles.card}>
      <div class={styles.iconWrapper}>
        <Building2 size={20} />
      </div>
      <div class={styles.info}>
        <p class={styles.name}>{props.lead.razonSocial ?? props.lead.ruc}</p>
        <Show when={props.lead.razonSocial}>
          <p class={styles.ruc}>{props.lead.ruc}</p>
        </Show>
        <p class={styles.stage}>{props.lead.stage}</p>
        <p class={styles.date}>Agregado {relativeDate()}</p>
      </div>
    </div>
  );
}
