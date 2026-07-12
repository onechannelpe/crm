import { createAsync, useAction } from "@solidjs/router";
import {
  For,
  Show,
  createEffect,
  createSignal,
  createUniqueId,
} from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import type { CapacityPolicyTeamDefaultsView } from "~/contracts/capacity";
import {
  updateLeadScopeDefaultMutation,
  updateSearchScopeDefaultMutation,
} from "~/lib/mutations/capacity";
import { capacityPolicyDefaultsQuery } from "~/lib/queries/capacity";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

type UpdateSearchDefault = (input: {
  scopeType: "team" | "branch";
  scopeId: string;
  monthlySearchLimit: number;
}) => Promise<unknown>;

type UpdateLeadDefault = (input: {
  scopeType: "team" | "branch";
  scopeId: string;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}) => Promise<unknown>;

interface TeamPolicyRowProps {
  team: CapacityPolicyTeamDefaultsView;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  onUpdateSearchDefault: UpdateSearchDefault;
  onUpdateLeadDefault: UpdateLeadDefault;
}

function TeamPolicyRow(props: TeamPolicyRowProps) {
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const formId = createUniqueId();

  const [searchLimit, setSearchLimit] = createSignal("");
  const [bufferTarget, setBufferTarget] = createSignal("");
  const [dailyRefill, setDailyRefill] = createSignal("");
  const [isDirty, setIsDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  // Reset from the refetched snapshot only while the row is untouched, so an
  // in-progress edit is never clobbered by a background revalidation.
  createEffect(() => {
    if (isDirty()) return;
    setSearchLimit(
      String(props.team.searchLimit ?? props.branchSearchLimit ?? 250),
    );
    setBufferTarget(
      String(
        props.team.activeBufferTarget ?? props.branchActiveBufferTarget ?? 10,
      ),
    );
    setDailyRefill(
      String(props.team.dailyRefillLimit ?? props.branchDailyRefillLimit ?? 25),
    );
  });

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await props.onUpdateSearchDefault({
        scopeType: "team",
        scopeId: props.team.teamId,
        monthlySearchLimit: Number(searchLimit()),
      });
      await props.onUpdateLeadDefault({
        scopeType: "team",
        scopeId: props.team.teamId,
        activeBufferTarget: Number(bufferTarget()),
        dailyRefillLimit: Number(dailyRefill()),
      });
      setIsDirty(false);
      enqueueSuccessSnackBar("Límites del equipo actualizados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id={formId} class={styles.teamCard} onSubmit={(e) => void save(e)}>
      <div class={styles.teamCardHeader}>
        <span class={styles.teamName}>{props.team.teamName}</span>
        <span class={styles.teamMeta}>
          Búsquedas {props.team.searchLimit ?? "(hereda)"} · Buffer{" "}
          {props.team.activeBufferTarget ?? "(hereda)"} · Refill{" "}
          {props.team.dailyRefillLimit ?? "(hereda)"}
        </span>
      </div>

      <div class={styles.numberGrid}>
        <Input
          type="number"
          label="Límite mensual"
          value={searchLimit()}
          onInput={(event) => {
            setIsDirty(true);
            setSearchLimit(event.currentTarget.value);
          }}
          required
        />
        <Input
          type="number"
          label="Buffer activo"
          value={bufferTarget()}
          onInput={(event) => {
            setIsDirty(true);
            setBufferTarget(event.currentTarget.value);
          }}
          required
        />
        <Input
          type="number"
          label="Refill diario"
          value={dailyRefill()}
          onInput={(event) => {
            setIsDirty(true);
            setDailyRefill(event.currentTarget.value);
          }}
          required
        />
      </div>

      <div class={styles.formActions}>
        <Button type="submit" size="sm" variant="secondary" loading={saving()}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export default function CapacityPoliciesPage() {
  const defaults = createAsync(() => capacityPolicyDefaultsQuery(), {
    initialValue: null,
  });
  const updateSearchDefault = useAction(updateSearchScopeDefaultMutation);
  const updateLeadDefault = useAction(updateLeadScopeDefaultMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const branchFormId = createUniqueId();

  const [branchSearchLimit, setBranchSearchLimit] = createSignal("250");
  const [branchBufferTarget, setBranchBufferTarget] = createSignal("10");
  const [branchDailyRefill, setBranchDailyRefill] = createSignal("25");
  const [savingBranch, setSavingBranch] = createSignal(false);

  createEffect(() => {
    const snapshot = defaults();
    if (!snapshot) return;
    if (snapshot.branchSearchLimit !== null) {
      setBranchSearchLimit(String(snapshot.branchSearchLimit));
    }
    if (snapshot.branchActiveBufferTarget !== null) {
      setBranchBufferTarget(String(snapshot.branchActiveBufferTarget));
    }
    if (snapshot.branchDailyRefillLimit !== null) {
      setBranchDailyRefill(String(snapshot.branchDailyRefillLimit));
    }
  });

  async function saveBranch(branchId: string): Promise<void> {
    setSavingBranch(true);
    try {
      await updateSearchDefault({
        scopeType: "branch",
        scopeId: branchId,
        monthlySearchLimit: Number(branchSearchLimit()),
      });
      await updateLeadDefault({
        scopeType: "branch",
        scopeId: branchId,
        activeBufferTarget: Number(branchBufferTarget()),
        dailyRefillLimit: Number(branchDailyRefill()),
      });
      enqueueSuccessSnackBar("Defaults de sucursal actualizados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setSavingBranch(false);
    }
  }

  return (
    <Show when={defaults()} keyed>
      {(snapshot) => (
        <>
          <SettingsSection
            title="Sucursal"
            description="Defaults de búsquedas y leads para toda la sucursal. Los equipos los heredan salvo que definan el suyo."
            actions={
              <Button
                type="submit"
                form={branchFormId}
                size="sm"
                variant="secondary"
                loading={savingBranch()}
              >
                Guardar
              </Button>
            }
          >
            <form
              id={branchFormId}
              onSubmit={(event) => {
                event.preventDefault();
                void saveBranch(snapshot.branchId);
              }}
            >
              <div class={styles.numberGrid}>
                <Input
                  type="number"
                  label="Límite mensual de búsquedas"
                  value={branchSearchLimit()}
                  onInput={(event) =>
                    setBranchSearchLimit(event.currentTarget.value)
                  }
                  required
                />
                <Input
                  type="number"
                  label="Buffer activo"
                  value={branchBufferTarget()}
                  onInput={(event) =>
                    setBranchBufferTarget(event.currentTarget.value)
                  }
                  required
                />
                <Input
                  type="number"
                  label="Refill diario"
                  value={branchDailyRefill()}
                  onInput={(event) =>
                    setBranchDailyRefill(event.currentTarget.value)
                  }
                  required
                />
              </div>
            </form>
          </SettingsSection>

          <SettingsSection
            title="Equipos"
            description="Ajusta los límites por equipo. Deja el valor heredado para seguir el default de la sucursal."
          >
            <div class={styles.teamList}>
              <For each={snapshot.teams}>
                {(team) => (
                  <TeamPolicyRow
                    team={team}
                    branchSearchLimit={snapshot.branchSearchLimit}
                    branchActiveBufferTarget={snapshot.branchActiveBufferTarget}
                    branchDailyRefillLimit={snapshot.branchDailyRefillLimit}
                    onUpdateSearchDefault={updateSearchDefault}
                    onUpdateLeadDefault={updateLeadDefault}
                  />
                )}
              </For>
            </div>
          </SettingsSection>
        </>
      )}
    </Show>
  );
}
