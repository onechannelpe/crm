import Building2 from "~/components/icons/building-2";
import { Badge } from "~/components/ui/display/badge";
import { FieldsWidget } from "~/features/workflow/fields/fields-widget";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";

import sectionStyles from "./section-shell.module.css";
import styles from "./lead-summary-section.module.css";

function stageVariant(stage: string) {
  if (stage === "READY_FOR_SALE") return "success" as const;
  if (stage === "NEEDS_EXECUTIVE_INPUT") return "warning" as const;
  return "secondary" as const;
}

export function LeadSummarySection(props: { data: LeadDetailView }) {
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

      <section class={sectionStyles.section}>
        <div class={sectionStyles.sectionTitle}>Campos</div>
        <FieldsWidget data={props.data} />
      </section>
    </>
  );
}
