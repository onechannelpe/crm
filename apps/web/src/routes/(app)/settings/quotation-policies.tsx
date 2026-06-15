import { createAsync, useAction } from "@solidjs/router";
import { Show, createEffect, createSignal } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { updateRateProposalPolicyMutation } from "~/lib/mutations/workflow-settings";
import { rateProposalPolicyQuery } from "~/lib/queries/workflow-settings";
import { formatDateTime } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

export default function QuotationPoliciesPage() {
  const policy = createAsync(() => rateProposalPolicyQuery(), {
    initialValue: null,
  });
  const updatePolicy = useAction(updateRateProposalPolicyMutation);

  const [validityDays, setValidityDays] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const snapshot = policy();
    if (!snapshot) return;
    setValidityDays(String(snapshot.validityDays));
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await updatePolicy({
        validityDays: Number(validityDays()),
      });
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppPage width="narrow" class="space-y-6">
      <div>
        <h2 class="text-2xl font-semibold">Politicas de cotizacion</h2>
        <p class="text-sm text-muted-foreground">
          Define cuantos dias puede aceptar el ejecutivo una tarifa propuesta.
        </p>
      </div>

      <Show when={policy()} keyed>
        {(snapshot) => (
          <form class="space-y-4 rounded border p-4" onSubmit={handleSubmit}>
            <Input
              type="number"
              min="1"
              max="90"
              step="1"
              label="Vigencia de propuesta (dias)"
              value={validityDays()}
              onInput={(event) => setValidityDays(event.currentTarget.value)}
              required
            />
            <p class="text-sm text-muted-foreground">
              Default del sistema: {snapshot.defaultValidityDays} dias.
              <Show when={snapshot.updatedAt}>
                {(updatedAt) => (
                  <> Ultima actualizacion: {formatDateTime(updatedAt())}.</>
                )}
              </Show>
            </p>
            <Show when={error()}>
              {(message) => <p class="text-sm text-destructive">{message()}</p>}
            </Show>
            <Button type="submit" loading={submitting()}>
              Guardar politica
            </Button>
          </form>
        )}
      </Show>
    </AppPage>
  );
}
