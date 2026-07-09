import { useAction } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import Checkbox from "~/components/icons/checkbox";
import Info from "~/components/icons/info";
import Package from "~/components/icons/package";
import { Button } from "~/components/ui/input/button";
import { TextInput } from "~/components/ui/input/text-input";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  type LeadPriority,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import {
  FieldInputValue,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSection,
  RecordDetailSectionActions,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { capitalize } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

import { reviewLeadMutation } from "../../../data/command-mutations";
import { revalidateWorkflowLead } from "../../../data/revalidate-workflow";

import styles from "./qualify-form.module.css";

function coerceStatus(value: string): LeadStatus | "" {
  return LEAD_STATUSES.find((status) => status === value) ?? "";
}

function coercePriority(value: string): LeadPriority | "" {
  return LEAD_PRIORITIES.find((priority) => priority === value) ?? "";
}

// CARTERIZADO and STOCK are the statuses that route the lead to DISQUALIFIED
// (see resolveReviewTransition); surfacing that up front avoids a surprising
// terminal transition after the reviewer clicks save.
function statusDisqualifies(status: LeadStatus | ""): boolean {
  return status === "CARTERIZADO" || status === "STOCK";
}

export function QualifyForm(props: { leadId: string }) {
  const review = useAction(reviewLeadMutation);

  const [status, setStatus] = createSignal<LeadStatus | "">("");
  const [priority, setPriority] = createSignal<LeadPriority | "">("");
  const [reason, setReason] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const currentStatus = status();
    const currentPriority = priority();
    if (currentStatus === "" || currentPriority === "") {
      setErrorMessage("Selecciona estado y prioridad.");
      return;
    }
    if (!reason().trim()) {
      setErrorMessage("El motivo es requerido.");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await review({
        leadId: props.leadId,
        status: currentStatus,
        priority: currentPriority,
        reason: reason().trim(),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      setErrorMessage(actionErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Calificar disponibilidad" />
      </RecordDetailSectionHeader>

      <RecordDetailSectionBody>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FieldTable>
            <FieldRow label="Estado" icon={Package}>
              <FieldInputValue>
                <select
                  class={styles.select}
                  value={status()}
                  onChange={(event) =>
                    setStatus(coerceStatus(event.currentTarget.value))
                  }
                  required
                >
                  <option value="">Elegir…</option>
                  <For each={LEAD_STATUSES}>
                    {(option) => (
                      <option value={option}>{capitalize(option)}</option>
                    )}
                  </For>
                </select>
              </FieldInputValue>
            </FieldRow>

            <FieldRow label="Prioridad" icon={Checkbox}>
              <FieldInputValue>
                <select
                  class={styles.select}
                  value={priority()}
                  onChange={(event) =>
                    setPriority(coercePriority(event.currentTarget.value))
                  }
                  required
                >
                  <option value="">Elegir…</option>
                  <For each={LEAD_PRIORITIES}>
                    {(option) => (
                      <option value={option}>{capitalize(option)}</option>
                    )}
                  </For>
                </select>
              </FieldInputValue>
            </FieldRow>

            <FieldRow label="Motivo" icon={Info}>
              <FieldInputValue>
                <TextInput
                  sizeVariant="sm"
                  value={reason()}
                  onChange={setReason}
                  required
                />
              </FieldInputValue>
            </FieldRow>
          </FieldTable>

          <Show when={statusDisqualifies(status())}>
            <p class={styles.warning}>
              Con este estado el cliente será descalificado y saldrá del flujo.
            </p>
          </Show>

          {errorMessage() && <p class={styles.error}>{errorMessage()}</p>}

          <RecordDetailSectionActions>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting()}
            >
              Guardar calificación
            </Button>
          </RecordDetailSectionActions>
        </form>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}
