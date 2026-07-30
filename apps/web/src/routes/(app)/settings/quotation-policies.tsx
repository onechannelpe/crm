import {
  createAsync,
  type RouteDefinition,
  useAction,
  useSubmission,
} from "@solidjs/router";
import { Show, createUniqueId, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsCounter } from "~/components/settings/settings-counter";
import {
  SettingsOptionCard,
  SettingsOptionCardRow,
} from "~/components/settings/settings-option-card";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Toggle } from "~/components/ui/input/toggle";
import { actionErrorMessage } from "~/contracts/errors";
import { formatAppDateTime } from "~/domain/time/app-time";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { pendingQuotationPolicyQuery } from "~/features/workflow/data/pending-quotation-policy.query";
import { rateProposalPolicyQuery } from "~/features/workflow/data/rate-proposal-policy.query";
import {
  updatePendingQuotationPolicyMutation,
  updateRateProposalPolicyMutation,
} from "~/features/workflow/data/settings-mutations";

import styles from "./settings-page.module.css";

type RateProposalPolicySnapshot = Awaited<
  ReturnType<typeof rateProposalPolicyQuery>
>;

type PendingQuotationPolicySnapshot = Awaited<
  ReturnType<typeof pendingQuotationPolicyQuery>
>;

export const route = {
  preload: () => {
    void rateProposalPolicyQuery();
    void pendingQuotationPolicyQuery();
  },
} satisfies RouteDefinition;

function RateProposalPolicyEditor(props: {
  snapshot: Accessor<RateProposalPolicySnapshot>;
}) {
  const initialSnapshot = props.snapshot();
  const updatePolicy = useAction(updateRateProposalPolicyMutation);
  const submission = useSubmission(updateRateProposalPolicyMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();
  const [draft, setDraft] = createStore({
    validityDays: initialSnapshot.validityDays,
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    try {
      await updatePolicy({
        validityDays: draft.validityDays,
      });

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
              <SettingsCounter
                ariaLabel="Vigencia de propuesta (días)"
                value={draft.validityDays}
                min={1}
                max={90}
                onChange={(value) => setDraft("validityDays", value)}
              />
            }
          />
        </SettingsOptionCard>

        <Show when={props.snapshot().updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatAppDateTime(updatedAt())}.
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
    limit: initialSnapshot.limit,
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    try {
      await updatePolicy(
        draft.enabled
          ? {
              enabled: true,
              limit: draft.limit,
            }
          : {
              enabled: false,
            },
      );

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
            <SettingsOptionCardRow
              title="Máximo de clientes pendientes"
              description="Se bloquea el registro de nuevos clientes cuando el ejecutivo alcanza este número."
              control={
                <SettingsCounter
                  ariaLabel="Máximo de clientes pendientes"
                  value={draft.limit}
                  min={1}
                  max={50}
                  onChange={(value) => setDraft("limit", value)}
                />
              }
            />
          </Show>
        </SettingsOptionCard>

        <Show when={props.snapshot().updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatAppDateTime(updatedAt())}.
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
    {
      initialValue: null,
    },
  );

  return (
    <SettingsPageLayout>
      <Show when={rateProposalPolicy()}>
        {(snapshot) => <RateProposalPolicyEditor snapshot={snapshot} />}
      </Show>

      <Show when={pendingQuotationPolicy()}>
        {(snapshot) => <PendingQuotationPolicyEditor snapshot={snapshot} />}
      </Show>
    </SettingsPageLayout>
  );
}
