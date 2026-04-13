import Building2 from "~/components/icons/building-2";
import { Badge } from "~/components/ui/display/badge";
import { formatDateTime } from "~/lib/utils";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

import styles from "./lead-detail-overview.module.css";

function stageVariant(stage: string) {
  if (stage === "READY_FOR_SALE") return "success" as const;
  if (stage === "NEEDS_EXECUTIVE_INPUT") return "warning" as const;
  return "secondary" as const;
}

export function LeadSummarySection(props: { data: LeadDetailView }) {
  const fields = [
    { label: "RUC", value: props.data.lead.ruc },
    { label: "Razón social", value: props.data.lead.razonSocial ?? "" },
    { label: "Dirección", value: props.data.lead.address ?? "" },
    { label: "Estado", value: props.data.lead.status ?? "" },
    { label: "Prioridad", value: props.data.lead.prioridad ?? "" },
    { label: "SUNAT", value: props.data.sourceStatus.sunat.status },
    { label: "Creado", value: formatDateTime(props.data.lead.createdAt) },
    {
      label: "Actualizado",
      value: formatDateTime(props.data.lead.updatedAt),
    },
  ] as const;

  return (
    <>
      <section class={styles.hero}>
        <div class={styles.heroIcon}>
          <Building2 size={16} />
        </div>
        <div class={styles.heroText}>
          <div class={styles.heroTitle}>
            {props.data.lead.razonSocial ?? ""}
          </div>
          <div class={styles.heroSubtitle}>RUC {props.data.lead.ruc}</div>
        </div>
        <Badge variant={stageVariant(props.data.lead.stage)}>
          {props.data.lead.stage}
        </Badge>
      </section>

      <section class={styles.section}>
        <div class={styles.sectionTitle}>Campos</div>
        <dl class={styles.fieldGrid}>
          {fields.map((field) => (
            <div class={styles.fieldRow}>
              <dt class={styles.fieldLabel}>{field.label}</dt>
              <dd class={styles.fieldValue}>{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
