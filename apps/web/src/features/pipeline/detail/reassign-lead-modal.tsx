import { createAsync, useAction } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";

import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { toAppError } from "~/lib/app-errors";
import { managedExecutivesQuery } from "~/lib/queries/capacity";

import { reassignLeadMutation } from "../data/mutations";

import styles from "./lead-actions-widget.module.css";

export function ReassignLeadModal(props: {
  leadId: number;
  onClose: () => void;
}) {
  const reassign = useAction(reassignLeadMutation);
  const executives = createAsync(() => managedExecutivesQuery());
  const [newExecutiveId, setNewExecutiveId] = createSignal<number | null>(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const id = newExecutiveId();
    if (id === null) return;
    setError(null);
    setSubmitting(true);
    try {
      await reassign({ leadId: props.leadId, newExecutiveId: id });
      props.onClose();
    } catch (err) {
      setError(toAppError(err, "Error al reasignar").publicMessage);
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
          <h3 class={styles.dialogTitle}>Reasignar prospecto</h3>
          <form class={styles.form} onSubmit={(e) => void handleSubmit(e)}>
            <Show when={executives()} fallback={<p>Cargando ejecutivos...</p>}>
              {(list) => (
                <Select
                  label="Nuevo ejecutivo"
                  value={newExecutiveId()?.toString() ?? ""}
                  onChange={(e) => {
                    const val = Number(e.currentTarget.value);
                    setNewExecutiveId(Number.isNaN(val) ? null : val);
                  }}
                  required
                >
                  <option value="" disabled>
                    Seleccionar ejecutivo
                  </option>
                  <For each={list()}>
                    {(exec) => (
                      <option value={exec.id.toString()}>
                        {exec.fullName}
                      </option>
                    )}
                  </For>
                </Select>
              )}
            </Show>
            {error() && <p class={styles.errorText}>{error()}</p>}
            <div class={styles.formActions}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting()}
                disabled={newExecutiveId() === null}
              >
                Confirmar reasignacion
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
