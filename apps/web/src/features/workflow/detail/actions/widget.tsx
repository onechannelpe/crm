import { useAction } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import type { LeadAvailableAction } from "~/contracts/workflow/views";
import {
  ActionRowButton,
  ActionRowLink,
  RelationList,
  RelationMeta,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  WidgetBody,
  Widget,
  WidgetHeader,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";
import { toAppError } from "~/lib/app-errors";

import {
  approveForSaleMutation,
  startSetupExecutionMutation,
} from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";
import { ReviewLeadModal } from "./review-modal";
import { mapLeadActionsToUi } from "./workflow-ui";

import widgetStyles from "./widget.module.css";

type OpenModal = "review-lead" | null;

export function LeadActionsWidget(props: {
  leadId: string;
  availableActions: LeadAvailableAction[];
}) {
  const approve = useAction(approveForSaleMutation);
  const startSetupExecution = useAction(startSetupExecutionMutation);
  const [openModal, setOpenModal] = createSignal<OpenModal>(null);
  const [approving, setApproving] = createSignal(false);
  const [startingSetupExecution, setStartingSetupExecution] =
    createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const actions = createMemo(() => mapLeadActionsToUi(props.availableActions));

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
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "Error al aprobar").publicMessage);
    } finally {
      setApproving(false);
    }
  }

  async function handleStartSetupExecution() {
    if (!props.availableActions.includes("start-setup-execution")) return;
    setError(null);
    setStartingSetupExecution(true);
    try {
      await startSetupExecution({ leadId: props.leadId });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(toAppError(err, "Error al iniciar afiliación").publicMessage);
    } finally {
      setStartingSetupExecution(false);
    }
  }

  function handleButtonAction(actionId: LeadAvailableAction) {
    if (approving()) return;
    if (actionId === "approve-for-sale") {
      void handleApprove();
      return;
    }
    if (actionId === "review-lead") {
      setOpenModal(actionId);
      return;
    }
    if (actionId === "start-setup-execution") {
      void handleStartSetupExecution();
    }
  }

  return (
    <>
      <Widget>
        <WidgetHeader>
          <WidgetTitle text="Acciones" />
        </WidgetHeader>
        <WidgetBody>
          <RelationList>
            <For each={actions()}>
              {(action) => (
                <Show
                  when={action.kind === "link" && action}
                  fallback={
                    <ActionRowButton
                      disabled={approving() || startingSetupExecution()}
                      onClick={() => handleButtonAction(action.id)}
                    >
                      <span>
                        {approving() && action.id === "approve-for-sale"
                          ? "Aprobando..."
                          : startingSetupExecution() &&
                              action.id === "start-setup-execution"
                            ? "Iniciando..."
                            : action.label}
                      </span>
                      <ChevronRight size={14} />
                    </ActionRowButton>
                  }
                >
                  {(linkAction) => (
                    <ActionRowLink href={linkAction().href}>
                      <span>{linkAction().label}</span>
                      <ChevronRight size={14} />
                    </ActionRowLink>
                  )}
                </Show>
              )}
            </For>
            <Show when={actions().length === 0}>
              <RelationRow>
                <span>Sin acciones disponibles</span>
                <RelationMeta>Flujo al día</RelationMeta>
              </RelationRow>
            </Show>
          </RelationList>
          <Show when={error()}>
            {(message) => <p class={widgetStyles.errorText}>{message()}</p>}
          </Show>
        </WidgetBody>
      </Widget>

      <Show when={openModal() === "review-lead"}>
        <ReviewLeadModal
          leadId={props.leadId}
          onClose={() => setOpenModal(null)}
        />
      </Show>
    </>
  );
}
