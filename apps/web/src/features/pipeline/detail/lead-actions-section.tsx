import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { createSignal } from "solid-js";

import { requestSaleApproval } from "~/actions/pipeline/commands/quotations";
import { toAppError } from "~/lib/app-errors";
import type { LeadAvailableAction } from "~/server/pipeline/application/contracts/lead-available-action";

import { mapLeadActionsToUi } from "./lead-workflow-ui";

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

  const actions = () =>
    mapLeadActionsToUi(props.leadId, props.availableActions);

  return (
    <section class={styles.section}>
      <div class={styles.sectionTitle}>Acciones</div>
      <div class={styles.actions}>
        {actions().map((action) => (
          <Show
            when={action.id !== "approve-for-sale"}
            fallback={
              <button
                class={styles.primaryAction}
                disabled={submitting()}
                onClick={() => void handleApproveForSale()}
                type="button"
              >
                {submitting() ? "Aprobando..." : action.label}
              </button>
            }
          >
            <Show
              when={action.href}
              fallback={
                <button class={styles.primaryAction} type="button" disabled>
                  {action.label}
                </button>
              }
            >
              {(href) => (
                <A class={styles.primaryAction} href={href()}>
                  {action.label}
                </A>
              )}
            </Show>
          </Show>
        ))}
      </div>
      <Show when={error()}>
        {(message) => <p class={styles.errorText}>{message()}</p>}
      </Show>
    </section>
  );
}
