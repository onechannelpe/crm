import { A, useAction } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { toAppError } from "~/lib/app-errors";
import type { LeadAvailableAction } from "~/server/pipeline/application/contracts/lead-available-action";

import { approveForSaleMutation } from "../data/mutations";
import { mapLeadActionsToUi } from "./lead-workflow-ui";
import { ReassignLeadModal } from "./reassign-lead-modal";
import { ReviewLeadModal } from "./review-lead-modal";

import styles from "../../side-panel/pages/lead-detail/page.module.css";
import widgetStyles from "./lead-actions-widget.module.css";

type OpenModal = "review-lead" | "reassign-lead" | null;

export function LeadActionsWidget(props: {
  leadId: number;
  availableActions: LeadAvailableAction[];
}) {
  const approve = useAction(approveForSaleMutation);
  const [openModal, setOpenModal] = createSignal<OpenModal>(null);
  const [approving, setApproving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const actions = createMemo(() =>
    mapLeadActionsToUi(props.leadId, props.availableActions),
  );

  onMount(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      if (!props.availableActions.includes("approve-for-sale")) return;
      event.preventDefault();
      void handleApprove();
    }
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  async function handleApprove() {
    if (!props.availableActions.includes("approve-for-sale")) return;
    setError(null);
    setApproving(true);
    try {
      await approve({ leadId: props.leadId });
    } catch (err) {
      setError(toAppError(err, "Error al aprobar").publicMessage);
    } finally {
      setApproving(false);
    }
  }

  function handleButtonAction(actionId: LeadAvailableAction) {
    if (approving()) return;
    if (actionId === "approve-for-sale") {
      void handleApprove();
      return;
    }
    if (actionId === "review-lead" || actionId === "reassign-lead") {
      setOpenModal(actionId);
    }
  }

  return (
    <>
      <section class={styles.widget}>
        <div class={styles.widgetHeader}>
          <h3 class={styles.widgetTitle}>Acciones</h3>
        </div>
        <div class={styles.relationList}>
          <For each={actions()}>
            {(action) => (
              <Show
                when={action.kind === "link" && action}
                fallback={
                  <button
                    type="button"
                    class={styles.actionRowButton}
                    disabled={approving()}
                    onClick={() => handleButtonAction(action.id)}
                  >
                    <span>
                      {approving() && action.id === "approve-for-sale"
                        ? "Aprobando..."
                        : action.label}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                }
              >
                {(linkAction) => (
                  <A class={styles.actionRowLink} href={linkAction().href}>
                    <span>{linkAction().label}</span>
                    <ChevronRight size={14} />
                  </A>
                )}
              </Show>
            )}
          </For>
          <Show when={actions().length === 0}>
            <div class={styles.relationRow}>
              <span>Sin acciones disponibles</span>
              <span class={styles.relationMeta}>Flujo al dia</span>
            </div>
          </Show>
        </div>
        <Show when={error()}>
          {(message) => <p class={widgetStyles.errorText}>{message()}</p>}
        </Show>
      </section>

      <Show when={openModal() === "review-lead"}>
        <ReviewLeadModal
          leadId={props.leadId}
          onClose={() => setOpenModal(null)}
        />
      </Show>
      <Show when={openModal() === "reassign-lead"}>
        <ReassignLeadModal
          leadId={props.leadId}
          onClose={() => setOpenModal(null)}
        />
      </Show>
    </>
  );
}
