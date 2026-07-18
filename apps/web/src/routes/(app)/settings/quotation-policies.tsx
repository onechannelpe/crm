import { createAsync, useAction, useSubmission } from "@solidjs/router";
import { Show, createUniqueId, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import {
  SettingsOptionCard,
  SettingsOptionCardRow,
  SettingsOptionCardSeparator,
} from "~/components/settings/settings-option-card";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Toggle } from "~/components/ui/input/toggle";
import {
  updatePendingQuotationPolicyMutation,
  updateRateProposalPolicyMutation,
} from "~/lib/mutations/workflow-settings";
import {
  pendingQuotationPolicyQuery,
  rateProposalPolicyQuery,
} from "~/lib/queries/workflow-settings";
import { formatDateTime } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

type RateProposalPolicySnapshot = Awaited<
  ReturnType<typeof rateProposalPolicyQuery>
>;

type PendingQuotationPolicySnapshot = Awaited<
  ReturnType<typeof pendingQuotationPolicyQuery>
>;

function RateProposalPolicyEditor(props: {
  snapshot: Accessor<RateProposalPolicySnapshot>;
}) {
  const initialSnapshot = props.snapshot();
  const updatePolicy = useAction(updateRateProposalPolicyMutation);
  const submission = useSubmission(updateRateProposalPolicyMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();
  const [draft, setDraft] = createStore({
    validityDays: String(initialSnapshot.validityDays),
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    try {
      await updatePolicy({ validityDays: Number(draft.validityDays) });
      enqueueSuccessSnackBar("Vigencia actualizada");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <SettingsSection
      title="Vigencia de propuestas"
      actions={
        <Button
          type="submit"
          form={formId}
          size="sm"
          variant="secondary"
          loading={submission.pending}
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
        <SettingsOptionCard>
          <SettingsOptionCardRow
            title="Vigencia de propuesta"
            description={`Días que tiene el ejecutivo para aceptar una tarifa propuesta. Predeterminado del sistema: ${props.snapshot().defaultValidityDays} días.`}
            control={
              <div class={styles.numberControl}>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  step="1"
                  class={styles.numberInput}
                  aria-label="Vigencia de propuesta (días)"
                  value={draft.validityDays}
                  onInput={(event) =>
                    setDraft("validityDays", event.currentTarget.value)
                  }
                  required
                />
              </div>
            }
          />
        </SettingsOptionCard>

        <Show when={props.snapshot().updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatDateTime(updatedAt())}.
            </p>
          )}
        </Show>
      </form>
    </SettingsSection>
  );
}

function PendingQuotationPolicyEditor(props: {
  snapshot: Accessor<PendingQuotationPolicySnapshot>;
}) {
  const initialSnapshot = props.snapshot();
  const updatePolicy = useAction(updatePendingQuotationPolicyMutation);
  const submission = useSubmission(updatePendingQuotationPolicyMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();
  const [draft, setDraft] = createStore({
    enabled: initialSnapshot.enabled,
    limit: String(initialSnapshot.limit),
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    // When the cap is off we still send a valid number so the request parses;
    // the server stores 0 (disabled) regardless of it.
    const limit = draft.enabled
      ? Number(draft.limit)
      : props.snapshot().suggestedLimit;
    try {
      await updatePolicy({ enabled: draft.enabled, limit });
      enqueueSuccessSnackBar(
        draft.enabled ? "Límite actualizado" : "Límite desactivado",
      );
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <SettingsSection
      title="Clientes pendientes por ejecutivo"
      actions={
        <Button
          type="submit"
          form={formId}
          size="sm"
          variant="secondary"
          loading={submission.pending}
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
        <SettingsOptionCard>
          <SettingsOptionCardRow
            interactive
            title="Aplicar límite de clientes pendientes"
            description="Desactivado de forma predeterminada. Al activarlo, el ejecutivo deberá aceptar, enviar a revisión o cerrar sus cotizaciones pendientes antes de registrar nuevos clientes."
            control={
              <Toggle
                ariaLabel="Aplicar límite de clientes pendientes"
                value={draft.enabled}
                onChange={(value) => setDraft("enabled", value)}
              />
            }
          />

          <Show when={draft.enabled}>
            <SettingsOptionCardSeparator />
            <SettingsOptionCardRow
              title="Máximo de clientes pendientes"
              description="Se bloquea el registro de nuevos clientes cuando el ejecutivo alcanza este número."
              control={
                <div class={styles.numberControl}>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    class={styles.numberInput}
                    aria-label="Máximo de clientes pendientes"
                    value={draft.limit}
                    onInput={(event) =>
                      setDraft("limit", event.currentTarget.value)
                    }
                    required
                  />
                </div>
              }
            />
          </Show>
        </SettingsOptionCard>

        <Show when={props.snapshot().updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatDateTime(updatedAt())}.
            </p>
          )}
        </Show>
      </form>
    </SettingsSection>
  );
}

export default function QuotationPoliciesPage() {
  const rateProposalPolicy = createAsync(() => rateProposalPolicyQuery(), {
    initialValue: null,
  });
  const pendingQuotationPolicy = createAsync(
    () => pendingQuotationPolicyQuery(),
    { initialValue: null },
  );

  return (
    <>
      <Show when={rateProposalPolicy()}>
        {(snapshot) => <RateProposalPolicyEditor snapshot={snapshot} />}
      </Show>
      <Show when={pendingQuotationPolicy()}>
        {(snapshot) => <PendingQuotationPolicyEditor snapshot={snapshot} />}
      </Show>
    </>
  );
}
