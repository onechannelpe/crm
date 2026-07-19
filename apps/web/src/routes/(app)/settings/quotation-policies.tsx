import {
  createAsync,
  type RouteDefinition,
  useAction,
  useSubmission,
} from "@solidjs/router";
import { createMemo, Show } from "solid-js";
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
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
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

export const route = {
  preload: () => {
    void rateProposalPolicyQuery();
    void pendingQuotationPolicyQuery();
  },
} satisfies RouteDefinition;

function QuotationPoliciesForm(props: {
  rate: RateProposalPolicySnapshot;
  pending: PendingQuotationPolicySnapshot;
}) {
  const updateRate = useAction(updateRateProposalPolicyMutation);
  const updatePending = useAction(updatePendingQuotationPolicyMutation);
  const rateSubmission = useSubmission(updateRateProposalPolicyMutation);
  const pendingSubmission = useSubmission(updatePendingQuotationPolicyMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [draft, setDraft] = createStore({
    validityDays: props.rate.validityDays,
    enabled: props.pending.enabled,
    limit: props.pending.limit,
  });

  const rateDirty = () => draft.validityDays !== props.rate.validityDays;
  const pendingDirty = () =>
    draft.enabled !== props.pending.enabled ||
    draft.limit !== props.pending.limit;
  const isDirty = () => rateDirty() || pendingDirty();
  const isSaving = () => rateSubmission.pending || pendingSubmission.pending;

  function reset() {
    setDraft({
      validityDays: props.rate.validityDays,
      enabled: props.pending.enabled,
      limit: props.pending.limit,
    });
  }

  async function save() {
    const updates: Promise<unknown>[] = [];

    if (rateDirty()) {
      updates.push(
        updateRate({
          validityDays: draft.validityDays,
        }),
      );
    }

    if (pendingDirty()) {
      // Disabled still needs a valid limit for parsing; the server stores 0.
      const limit = draft.enabled ? draft.limit : props.pending.suggestedLimit;

      updates.push(
        updatePending({
          enabled: draft.enabled,
          limit,
        }),
      );
    }

    try {
      await Promise.all(updates);
      enqueueSuccessSnackBar("Cambios guardados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <SettingsPageLayout
      actionButton={
        <div class={styles.topBarActions}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!isDirty() || isSaving()}
            onClick={reset}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            loading={isSaving()}
            disabled={!isDirty()}
            onClick={() => void save()}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <SettingsSection title="Vigencia de propuestas">
        <SettingsOptionCard>
          <SettingsOptionCardRow
            title="Vigencia de propuesta"
            description={`Días que tiene el ejecutivo para aceptar una tarifa propuesta. Predeterminado del sistema: ${props.rate.defaultValidityDays} días.`}
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

        <Show when={props.rate.updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatDateTime(updatedAt())}.
            </p>
          )}
        </Show>
      </SettingsSection>

      <SettingsSection title="Clientes pendientes por ejecutivo">
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

        <Show when={props.pending.updatedAt}>
          {(updatedAt) => (
            <p class={styles.helperText}>
              Última actualización: {formatDateTime(updatedAt())}.
            </p>
          )}
        </Show>
      </SettingsSection>
    </SettingsPageLayout>
  );
}

export default function QuotationPoliciesPage() {
  const rate = createAsync(() => rateProposalPolicyQuery(), {
    initialValue: null,
  });
  const pending = createAsync(() => pendingQuotationPolicyQuery(), {
    initialValue: null,
  });

  const snapshot = createMemo(() => {
    const rateValue = rate();
    const pendingValue = pending();

    return rateValue && pendingValue
      ? {
          rate: rateValue,
          pending: pendingValue,
        }
      : null;
  });

  return (
    <Show
      when={snapshot()}
      fallback={<SettingsPageLayout>{null}</SettingsPageLayout>}
    >
      {(data) => (
        <QuotationPoliciesForm rate={data().rate} pending={data().pending} />
      )}
    </Show>
  );
}
