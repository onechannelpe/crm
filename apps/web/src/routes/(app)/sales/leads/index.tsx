import { useAction, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";

import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { createExtensionPortConnection } from "~/lib/extension/port";
import {
  handoffLeadToExtension,
  isExtensionBridgeConfigured,
} from "~/lib/extension/runtime";
import { useExtensionStateObserver } from "~/lib/extension/use-extension-state-observer";
import {
  registerCallMutation,
  requestLeadsMutation,
} from "~/lib/mutations/leads";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./leads-page.module.css";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorMessage(value: unknown): string | null {
  if (!isObject(value) || typeof value.error !== "string") {
    return null;
  }

  return value.error;
}

function isHandoffTokenResponse(
  value: unknown,
): value is { handoffToken: string; expiresAt: number } {
  return (
    isObject(value) &&
    typeof value.handoffToken === "string" &&
    typeof value.expiresAt === "number"
  );
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: currentLeads, update: updateLeads } = createOptimisticQuery(
    activeLeadsQuery,
    { initialValue: [] },
  );
  const requestLeadsAction = useAction(requestLeadsMutation);
  const registerCallAction = useAction(registerCallMutation);
  const { state: extensionState, error: extensionError } =
    createExtensionPortConnection();
  const [extensionLoadingAssignmentId, setExtensionLoadingAssignmentId] =
    createSignal<number | null>(null);

  // Observe extension state changes and emit toasts
  useExtensionStateObserver({
    extensionState,
    extensionError,
    onReauthRequired: () => {
      showToast("error", "La extensión necesita reconectarse.");
    },
    onSyncError: () => {
      showToast("error", "Error de sincronización con la extensión.");
    },
    onActiveAssignmentChange: (assignmentId) => {
      if (assignmentId) {
        showToast("info", `Lead #${assignmentId} activo en la extensión.`);
      }
    },
    onErrorChange: (error) => {
      if (error) {
        showToast("error", error);
      }
    },
  });

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
    let draftRecordId: number | null = null;
    await updateLeads({
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        const result = await registerCallAction(
          assignmentId,
          contactId,
          outcome,
          notes,
        );
        draftRecordId = result.draftRecordId;
      },
    });

    if (draftRecordId) {
      navigate(`/sales/records/${draftRecordId}/edit`);
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
    const handoffTokenResponse = await fetch("/api/extension/handoff-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId: lead.assignmentId }),
    });
    if (!handoffTokenResponse.ok) {
      const body = (await handoffTokenResponse
        .json()
        .catch(() => null)) as unknown;
      setExtensionLoadingAssignmentId(null);
      const message =
        readErrorMessage(body) ??
        "No se pudo autorizar el handoff a la extensión.";
      showToast("error", message);
      return;
    }

    const handoffTokenBody = (await handoffTokenResponse.json()) as unknown;
    if (!isHandoffTokenResponse(handoffTokenBody)) {
      setExtensionLoadingAssignmentId(null);
      showToast("error", "El servidor devolvió un handoff inválido.");
      return;
    }

    const response = await handoffLeadToExtension({
      token: handoffTokenBody.handoffToken,
    });
    setExtensionLoadingAssignmentId(null);

    if (!response.ok) {
      showToast("error", response.error);
      return;
    }

    showToast("success", "Cliente enviado a la extensión.");
  };

  return (
    <AppPage>
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
