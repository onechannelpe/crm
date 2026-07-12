import { createAsync, useAction } from "@solidjs/router";
import { Show, createEffect, createSignal, createUniqueId } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { updateRateProposalPolicyMutation } from "~/lib/mutations/workflow-settings";
import { rateProposalPolicyQuery } from "~/lib/queries/workflow-settings";
import { formatDateTime } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

export default function QuotationPoliciesPage() {
  const policy = createAsync(() => rateProposalPolicyQuery(), {
    initialValue: null,
  });
  const updatePolicy = useAction(updateRateProposalPolicyMutation);
  const formId = createUniqueId();

  const [validityDays, setValidityDays] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [policySaveErrorMessage, setPolicySaveErrorMessage] = createSignal<
    string | null
  >(null);

  createEffect(() => {
    const snapshot = policy();
    if (!snapshot) return;
    setValidityDays(String(snapshot.validityDays));
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setPolicySaveErrorMessage(null);
    setSubmitting(true);

    try {
      await updatePolicy({
        validityDays: Number(validityDays()),
      });
    } catch (caught) {
      setPolicySaveErrorMessage(actionErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Show when={policy()} keyed>
      {(snapshot) => (
        <SettingsSection
          title="Vigencia de propuestas"
          description="Cuántos días puede el ejecutivo aceptar una tarifa propuesta."
          actions={
            <Button
              type="submit"
              form={formId}
              size="sm"
              variant="secondary"
              loading={submitting()}
            >
              Guardar
            </Button>
          }
        >
          <form
            id={formId}
            class={styles.stack}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div class={styles.formGrid}>
              <Input
                type="number"
                min="1"
                max="90"
                step="1"
                label="Vigencia de propuesta (días)"
                value={validityDays()}
                onInput={(event) => setValidityDays(event.currentTarget.value)}
                required
              />
            </div>

            <p class={styles.helperText}>
              Default del sistema: {snapshot.defaultValidityDays} días.
              <Show when={snapshot.updatedAt}>
                {(updatedAt) => (
                  <> Última actualización: {formatDateTime(updatedAt())}.</>
                )}
              </Show>
            </p>

            <Show when={policySaveErrorMessage()}>
              {(message) => <p class={styles.errorText}>{message()}</p>}
            </Show>
          </form>
        </SettingsSection>
      )}
    </Show>
  );
}
