import { A } from "@solidjs/router";
import { Show } from "solid-js";

import type { LeadAvailableAction } from "~/actions/pipeline/contracts";

import styles from "./lead-detail-overview.module.css";

export function LeadActionsSection(props: {
  leadId: number;
  availableActions: LeadAvailableAction[];
}) {
  return (
    <section class={styles.section}>
      <div class={styles.sectionTitle}>Acciones</div>
      <div class={styles.actions}>
        <Show
          when={props.availableActions.includes("complete-commercial-input")}
        >
          <A
            class={styles.primaryAction}
            href={`/leads/${props.leadId}/complete`}
          >
            Completar información comercial
          </A>
        </Show>
        <Show when={props.availableActions.includes("create-sale")}>
          <A class={styles.primaryAction} href={`/sales/new/${props.leadId}`}>
            Crear venta
          </A>
        </Show>
        <A class={styles.secondaryAction} href={`/leads/${props.leadId}`}>
          Abrir detalle completo
        </A>
      </div>
    </section>
  );
}
