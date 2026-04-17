import { useAction } from "@solidjs/router";
import { createSignal } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import { toAppError } from "~/lib/app-errors";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
} from "~/pipeline/contracts/lead-schema";
import { type LeadId } from "~/server/pipeline/domain/lead-record";

import { reviewLeadMutation } from "../data/mutations";

import styles from "./lead-actions-widget.module.css";

export function ReviewLeadModal(props: {
  leadId: LeadId;
  onClose: () => void;
}) {
  const review = useAction(reviewLeadMutation);
  const [status, setStatus] = createSignal(LEAD_STATUSES[0] as string);
  const [prioridad, setPrioridad] = createSignal(LEAD_PRIORITIES[0] as string);
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
      props.onClose();
    } catch (err) {
      setError(toAppError(err, "Error al revisar").publicMessage);
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
        <div class={styles.dialog} role="dialog" aria-modal="true">
          <h3 class={styles.dialogTitle}>Revisar prospecto</h3>
          <form class={styles.form} onSubmit={(e) => void handleSubmit(e)}>
            <Select
              label="Estado"
              value={status()}
              onChange={(e) => setStatus(e.currentTarget.value)}
              required
            >
              {LEAD_STATUSES.map((s) => (
                <option value={s}>{s}</option>
              ))}
            </Select>
            <Select
              label="Prioridad"
              value={prioridad()}
              onChange={(e) => setPrioridad(e.currentTarget.value)}
              required
            >
              {LEAD_PRIORITIES.map((p) => (
                <option value={p}>{p}</option>
              ))}
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
        </div>
      </div>
    </Portal>
  );
}
