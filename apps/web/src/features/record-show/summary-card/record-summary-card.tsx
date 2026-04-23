import { createMemo, Show } from "solid-js";

import Building2 from "~/components/icons/building-2";
import type { LeadDetailLeadView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "./record-summary-card.module.css";

type RecordSummaryCardProps = {
  lead: LeadDetailLeadView;
};

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

export function RecordSummaryCard(props: RecordSummaryCardProps) {
  const relativeDate = createMemo(() =>
    formatRelativeDate(props.lead.createdAt),
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
