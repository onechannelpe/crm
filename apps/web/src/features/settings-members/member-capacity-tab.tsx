import { createAsync, useAction, useSubmission } from "@solidjs/router";
import { For, Show, createSignal, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import {
  CapacityLimitFields,
  type CapacityLimitsDraft,
} from "~/components/settings/capacity-limit-fields";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import type { ExecutiveCapacityDetailView } from "~/contracts/capacity";
import {
  grantMoreLeadRefillMutation,
  grantMoreSearchesMutation,
  updateExecutivePolicyOverrideMutation,
} from "~/lib/mutations/capacity";
import { executiveCapacityDetailQuery } from "~/lib/queries/capacity";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-members.module.css";

export function MemberCapacityTab(props: { userId: string }) {
  const detail = createAsync(() => executiveCapacityDetailQuery(props.userId), {
    initialValue: null,
  });

  return (
    <Show
      when={detail()}
      fallback={
        <p class={styles.rosterEmpty}>Este usuario no gestiona capacidad.</p>
      }
    >
      {(snapshot) => <MemberCapacityEditor detail={snapshot} />}
    </Show>
  );
}

function MemberCapacityEditor(props: {
  detail: Accessor<ExecutiveCapacityDetailView>;
}) {
  const initialDetail = props.detail();
  const grantSearches = useAction(grantMoreSearchesMutation);
  const grantRefill = useAction(grantMoreLeadRefillMutation);
  const saveOverrideAction = useAction(updateExecutivePolicyOverrideMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const executiveId = () => props.detail().executive.id;
  const searchGrantSubmission = useSubmission(
    grantMoreSearchesMutation,
    (input) => input[0] === executiveId(),
  );
  const refillGrantSubmission = useSubmission(
    grantMoreLeadRefillMutation,
    (input) => input[0] === executiveId(),
  );
  const overrideSubmission = useSubmission(
    updateExecutivePolicyOverrideMutation,
    (input) => input[0].userId === executiveId(),
  );

  const [searchGrant, setSearchGrant] = createSignal("25");
  const [leadGrant, setLeadGrant] = createSignal("10");

  const [override, setOverride] = createStore<CapacityLimitsDraft>({
    searchLimit: String(initialDetail.searchStatus.policy.monthlyLimit),
    bufferTarget: String(initialDetail.leadStatus.policy.bufferTarget),
    dailyRefillLimit: String(initialDetail.leadStatus.policy.dailyLimit),
  });

  async function handleGrantSearches() {
    try {
      await grantSearches(
        executiveId(),
        Number(searchGrant()),
        "Ajuste manual",
      );
      enqueueSuccessSnackBar("Búsquedas otorgadas");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  async function handleGrantRefill() {
    try {
      await grantRefill(executiveId(), Number(leadGrant()), "Ajuste manual");
      enqueueSuccessSnackBar("Refills otorgados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  async function saveOverride() {
    try {
      await saveOverrideAction({
        userId: executiveId(),
        monthlySearchLimit: Number(override.searchLimit),
        activeBufferTarget: Number(override.bufferTarget),
        dailyRefillLimit: Number(override.dailyRefillLimit),
        expiresAt: null,
      });
      enqueueSuccessSnackBar("Override actualizado");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <>
      <SettingsSection
        title="Política efectiva"
        description="Los límites que rigen hoy para este usuario y de dónde provienen."
      >
        <div class={styles.capacityCards}>
          <div class={styles.capacityCard}>
            <span class={styles.capacityCardLabel}>Búsquedas</span>
            <span class={styles.capacityCardValue}>
              {props.detail().searchStatus.policy.monthlyLimit} por mes
            </span>
            <span class={styles.capacityCardMeta}>
              Fuente: {props.detail().searchStatus.policy.source}
            </span>
          </div>
          <div class={styles.capacityCard}>
            <span class={styles.capacityCardLabel}>Leads</span>
            <span class={styles.capacityCardValue}>
              Buffer {props.detail().leadStatus.policy.bufferTarget} · Refill{" "}
              {props.detail().leadStatus.policy.dailyLimit}
            </span>
            <span class={styles.capacityCardMeta}>
              Fuente: {props.detail().leadStatus.policy.source}
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Estado actual"
        description="Consumo del periodo en curso."
      >
        <div class={styles.capacityCards}>
          <div class={styles.capacityCard}>
            <span class={styles.capacityCardLabel}>Búsquedas del mes</span>
            <span class={styles.capacityCardValue}>
              {props.detail().searchStatus.committed}/
              {props.detail().searchStatus.policy.monthlyLimit +
                props.detail().searchStatus.granted}
            </span>
            <span class={styles.capacityCardMeta}>
              {props.detail().searchStatus.remaining} restantes
            </span>
          </div>
          <div class={styles.capacityCard}>
            <span class={styles.capacityCardLabel}>Capacidad de leads</span>
            <span class={styles.capacityCardValue}>
              {props.detail().leadStatus.activeAssignments}/
              {props.detail().leadStatus.policy.bufferTarget} activos
            </span>
            <span class={styles.capacityCardMeta}>
              {props.detail().leadStatus.remaining} refills disponibles hoy
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Otorgar capacidad"
        description="Concede búsquedas o refills adicionales de forma puntual."
      >
        <div class={styles.capacityGrantGrid}>
          <form
            class={styles.capacityForm}
            onSubmit={(event) => {
              event.preventDefault();
              void handleGrantSearches();
            }}
          >
            <span class={styles.capacityCardLabel}>Búsquedas extra</span>
            <Input
              type="number"
              label="Cantidad"
              value={searchGrant()}
              onInput={(event) => setSearchGrant(event.currentTarget.value)}
              required
            />
            <div class={styles.capacityActions}>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                loading={searchGrantSubmission.pending}
              >
                Otorgar
              </Button>
            </div>
          </form>

          <form
            class={styles.capacityForm}
            onSubmit={(event) => {
              event.preventDefault();
              void handleGrantRefill();
            }}
          >
            <span class={styles.capacityCardLabel}>Refills extra</span>
            <Input
              type="number"
              label="Cantidad"
              value={leadGrant()}
              onInput={(event) => setLeadGrant(event.currentTarget.value)}
              required
            />
            <div class={styles.capacityActions}>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                loading={refillGrantSubmission.pending}
              >
                Otorgar
              </Button>
            </div>
          </form>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Override de política"
        description="Fija límites propios para este usuario, por encima del default de su equipo."
      >
        <form
          class={styles.capacityForm}
          onSubmit={(event) => {
            event.preventDefault();
            void saveOverride();
          }}
        >
          <CapacityLimitFields
            draft={override}
            setValue={(key, value) => setOverride(key, value)}
          />
          <div class={styles.capacityActions}>
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              loading={overrideSubmission.pending}
            >
              Guardar override
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title="Historial de solicitudes">
        <Show
          when={props.detail().requests.length > 0}
          fallback={
            <p class={styles.rosterEmpty}>Sin solicitudes registradas.</p>
          }
        >
          <div class={styles.requestList}>
            <For each={props.detail().requests}>
              {(request) => (
                <div class={styles.requestItem}>
                  <span class={styles.requestTitle}>
                    {request.kind === "search_extra"
                      ? "Más búsquedas"
                      : "Más refills"}{" "}
                    · {request.requestedAmount}
                  </span>
                  <span class={styles.requestMeta}>
                    {request.status} · {request.reason}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </SettingsSection>
    </>
  );
}
