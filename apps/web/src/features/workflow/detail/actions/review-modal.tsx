import { useAction } from "@solidjs/router";
import { For, createSignal } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  type LeadPriority,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import { actionErrorMessage } from "~/lib/error-messages";

import { reviewLeadMutation } from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

import styles from "./review-modal.module.css";

export function ReviewLeadModal(props: {
  leadId: string;
  onClose: () => void;
}) {
  const review = useAction(reviewLeadMutation);
  const [status, setStatus] = createSignal<LeadStatus>(LEAD_STATUSES[0]);
  const [prioridad, setPrioridad] = createSignal<LeadPriority>(
    LEAD_PRIORITIES[0],
  );
  const [reason, setReason] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!reason().trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await review({
        leadId: props.leadId,
        status: status(),
        prioridad: prioridad(),
        reason: reason(),
      });
      await revalidateWorkflowLead(props.leadId);
      props.onClose();
    } catch (err) {
      setError(actionErrorMessage(err, "Error al revisar"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget && !submitting()) props.onClose();
  }

  return (
    <Portal>
      <div
        class={styles.overlay}
        role="presentation"
        onClick={handleOverlayClick}
      >
        <dialog open class={styles.dialog} aria-modal="true">
          <h3 class={styles.dialogTitle}>Revisar cliente</h3>
          <form class={styles.form} onSubmit={(e) => void handleSubmit(e)}>
            <Select
              label="Estado"
              value={status()}
              onChange={(e) => setStatus(e.currentTarget.value as LeadStatus)}
              required
            >
              <For each={LEAD_STATUSES}>
                {(s) => <option value={s}>{s}</option>}
              </For>
            </Select>
            <Select
              label="Prioridad"
              value={prioridad()}
              onChange={(e) =>
                setPrioridad(e.currentTarget.value as LeadPriority)
              }
              required
            >
              <For each={LEAD_PRIORITIES}>
                {(p) => <option value={p}>{p}</option>}
              </For>
            </Select>
            <Textarea
              label="Motivo"
              value={reason()}
              onInput={(e) => setReason(e.currentTarget.value)}
              required
              placeholder="Descripcion del resultado de la revision"
            />
            {error() && <p class={styles.errorText}>{error()}</p>}
            <div class={styles.formActions}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting()}
              >
                Confirmar revision
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={submitting()}
                onClick={props.onClose}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </dialog>
      </div>
    </Portal>
  );
}
