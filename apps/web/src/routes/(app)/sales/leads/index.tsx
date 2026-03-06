import { useAction, useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, onMount, Show } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import {
  getExtensionExecutiveState,
  handoffLeadToExtension,
  isExtensionBridgeConfigured,
  type ExtensionExecutiveState,
} from "~/lib/extension/runtime";
import {
  registerCallMutation,
  requestLeadsMutation,
} from "~/lib/mutations/leads";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: currentLeads, update: updateLeads } = createOptimisticQuery(
    activeLeadsQuery,
    { initialValue: [] },
  );
  const requestLeadsAction = useAction(requestLeadsMutation);
  const registerCallAction = useAction(registerCallMutation);
  const [extensionState, setExtensionState] =
    createSignal<ExtensionExecutiveState | null>(null);
  const [extensionLoadingAssignmentId, setExtensionLoadingAssignmentId] =
    createSignal<number | null>(null);
  const [extensionError, setExtensionError] = createSignal<string | null>(null);
  let pollIntervalId: number | undefined;

  const refreshExtensionState = async () => {
    if (!isExtensionBridgeConfigured()) {
      setExtensionState(null);
      setExtensionError("Configura VITE_CRM_EXTENSION_ID para conectar la extensión.");
      return;
    }

    const response = await getExtensionExecutiveState();
    if (!response.ok) {
      setExtensionError(response.error);
      return;
    }

    setExtensionState(response.executiveState);
    setExtensionError(null);
  };

  const handleRequestLeads = async () => {
    const result = await requestLeadsAction();
    // Do not await: the assigned count is returned immediately so the caller
    // (RequestLeadsButton) can display it without waiting for the list refresh.
    return result.assigned;
  };

  const handleRegisterCall = async (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes: string,
  ) => {
    await updateLeads({
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        await registerCallAction(assignmentId, contactId, outcome, notes);
      },
    });

    if (outcome === "sale_made") {
      navigate(`/sales/records/new?contactId=${contactId}`);
    }
  };

  const handleSendToExtension = async (lead: {
    assignmentId: number;
    contactId: number;
    name: string;
    organization_id: number;
    phone_primary: string | null;
  }) => {
    if (!lead.phone_primary) {
      showToast("error", "El cliente asignado no tiene teléfono disponible.");
      return;
    }

    setExtensionLoadingAssignmentId(lead.assignmentId);
    const response = await handoffLeadToExtension({
      assignmentId: lead.assignmentId,
      contactId: lead.contactId,
      phone: lead.phone_primary,
      clientName: lead.name,
      organizationLabel: `Org #${lead.organization_id}`,
    });
    setExtensionLoadingAssignmentId(null);

    if (!response.ok) {
      setExtensionError(response.error);
      showToast("error", response.error);
      return;
    }

    setExtensionState(response.executiveState);
    setExtensionError(null);
    showToast("success", "Cliente enviado a la extensión.");
  };

  onMount(() => {
    void refreshExtensionState();
    pollIntervalId = window.setInterval(() => {
      void refreshExtensionState();
    }, 4000);
  });

  onCleanup(() => {
    if (pollIntervalId) {
      window.clearInterval(pollIntervalId);
    }
  });

  return (
    <AppPage>
      <div class={styles.extensionBanner}>
        <div class={styles.extensionHeader}>
          <div>
            <p class={styles.extensionEyebrow}>Extension status</p>
            <h2 class={styles.extensionTitle}>CRM call companion</h2>
          </div>
          <Badge
            variant={
              extensionState()?.status === "active"
                ? "success"
                : extensionState()?.status === "dialing"
                  ? "warning"
                  : extensionState()?.status === "sync_error"
                    ? "destructive"
                    : extensionState()?.status === "sync_pending"
                      ? "info"
                      : "outline"
            }
          >
            {extensionState()?.status ?? "unavailable"}
          </Badge>
        </div>
        <p class={styles.extensionCopy}>
          <Show
            when={!extensionError()}
            fallback={extensionError() ?? "La extensión no está disponible."}
          >
            {extensionState()?.assignmentId
              ? `Lead activo en la extensión: #${extensionState()?.assignmentId}`
              : "Envía un cliente asignado a la extensión para iniciar la llamada."}
          </Show>
        </p>
      </div>
      <LeadList
        contacts={currentLeads()}
        onRegisterCall={handleRegisterCall}
        onSendToExtension={handleSendToExtension}
        extensionState={extensionState()}
        extensionLoadingAssignmentId={extensionLoadingAssignmentId()}
        extensionEnabled={isExtensionBridgeConfigured()}
        emptyAction={<RequestLeadsButton onRequest={handleRequestLeads} />}
      />
      <div class={styles.fabContainer}>
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>
    </AppPage>
  );
}
