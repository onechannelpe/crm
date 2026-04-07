import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { createSignal } from "solid-js";

import { requestSaleApproval } from "~/actions/pipeline/commands/quotations";
import { toAppError } from "~/lib/app-errors";
import type { LeadAvailableAction } from "~/server/pipeline/application/contracts/lead-available-action";

import styles from "./lead-detail-overview.module.css";

export function LeadActionsSection(props: {
  leadId: number;
  availableActions: LeadAvailableAction[];
  onChanged?: () => void;
}) {
  const [error, setError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  async function handleApproveForSale() {
    setError(null);
    setSubmitting(true);
    try {
      await requestSaleApproval(props.leadId);
      props.onChanged?.();
    } catch (submitError) {
      setError(toAppError(submitError, "Error al aprobar").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section class={styles.section}>
      <div class={styles.sectionTitle}>Acciones</div>
      <div class={styles.actions}>
        <Show when={props.availableActions.includes("review-lead")}>
          <A class={styles.primaryAction} href={`/review/${props.leadId}`}>
            Revisar lead
          </A>
        </Show>
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
        <Show when={props.availableActions.includes("create-quotation")}>
          <A class={styles.primaryAction} href={`/quotations/${props.leadId}`}>
            Crear cotización
          </A>
        </Show>
        <Show when={props.availableActions.includes("approve-for-sale")}>
          <button
            class={styles.primaryAction}
            disabled={submitting()}
            onClick={() => void handleApproveForSale()}
            type="button"
          >
            {submitting() ? "Aprobando..." : "Aprobar para venta"}
          </button>
        </Show>
        <A class={styles.secondaryAction} href={`/leads/${props.leadId}`}>
          Abrir detalle completo
        </A>
      </div>
      <Show when={error()}>
        {(message) => <p class={styles.errorText}>{message()}</p>}
      </Show>
    </section>
  );
}
