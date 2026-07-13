import { Key } from "@solid-primitives/keyed";
import { createAsync, useAction, useSubmission } from "@solidjs/router";
import { Show, createUniqueId, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import {
  CapacityLimitFields,
  type CapacityLimitsDraft,
} from "~/components/settings/capacity-limit-fields";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import type {
  CapacityPolicyDefaultsView,
  CapacityPolicyTeamDefaultsView,
} from "~/contracts/capacity";
import { updateScopePolicyMutation } from "~/lib/mutations/capacity";
import { capacityPolicyDefaultsQuery } from "~/lib/queries/capacity";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

function TeamPolicyRow(props: {
  team: Accessor<CapacityPolicyTeamDefaultsView>;
  branchDefaults: Accessor<CapacityPolicyDefaultsView>;
}) {
  const initialTeam = props.team();
  const initialBranchDefaults = props.branchDefaults();
  const savePolicy = useAction(updateScopePolicyMutation);
  // One shared action drives every row; scope pending to this team's submission
  // so saving one row never spins another row's button.
  const submission = useSubmission(
    updateScopePolicyMutation,
    (input) =>
      input[0].scopeType === "team" && input[0].scopeId === props.team().teamId,
  );
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [draft, setDraft] = createStore<CapacityLimitsDraft>({
    searchLimit: String(
      initialTeam.searchLimit ?? initialBranchDefaults.branchSearchLimit ?? 250,
    ),
    bufferTarget: String(
      initialTeam.activeBufferTarget ??
        initialBranchDefaults.branchActiveBufferTarget ??
        10,
    ),
    dailyRefillLimit: String(
      initialTeam.dailyRefillLimit ??
        initialBranchDefaults.branchDailyRefillLimit ??
        25,
    ),
  });

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    try {
      await savePolicy({
        scopeType: "team",
        scopeId: props.team().teamId,
        monthlySearchLimit: Number(draft.searchLimit),
        activeBufferTarget: Number(draft.bufferTarget),
        dailyRefillLimit: Number(draft.dailyRefillLimit),
      });
      enqueueSuccessSnackBar("Límites del equipo actualizados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <form class={styles.teamCard} onSubmit={(event) => void save(event)}>
      <div class={styles.teamCardHeader}>
        <span class={styles.teamName}>{props.team().teamName}</span>
        <span class={styles.teamMeta}>
          Búsquedas {props.team().searchLimit ?? "(hereda)"} · Buffer{" "}
          {props.team().activeBufferTarget ?? "(hereda)"} · Refill{" "}
          {props.team().dailyRefillLimit ?? "(hereda)"}
        </span>
      </div>

      <CapacityLimitFields
        draft={draft}
        setValue={(key, value) => setDraft(key, value)}
      />

      <div class={styles.formActions}>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={submission.pending}
        >
          Guardar
        </Button>
      </div>
    </form>
  );
}

function CapacityPoliciesEditor(props: {
  snapshot: Accessor<CapacityPolicyDefaultsView>;
}) {
  const initialSnapshot = props.snapshot();
  const savePolicy = useAction(updateScopePolicyMutation);
  const submission = useSubmission(
    updateScopePolicyMutation,
    (input) => input[0].scopeType === "branch",
  );
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const branchFormId = createUniqueId();

  const [branchDraft, setBranchDraft] = createStore<CapacityLimitsDraft>({
    searchLimit: String(initialSnapshot.branchSearchLimit ?? 250),
    bufferTarget: String(initialSnapshot.branchActiveBufferTarget ?? 10),
    dailyRefillLimit: String(initialSnapshot.branchDailyRefillLimit ?? 25),
  });

  async function saveBranch(): Promise<void> {
    try {
      await savePolicy({
        scopeType: "branch",
        scopeId: props.snapshot().branchId,
        monthlySearchLimit: Number(branchDraft.searchLimit),
        activeBufferTarget: Number(branchDraft.bufferTarget),
        dailyRefillLimit: Number(branchDraft.dailyRefillLimit),
      });
      enqueueSuccessSnackBar("Defaults de sucursal actualizados");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
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
            loading={submission.pending}
          >
            Guardar
          </Button>
        }
      >
        <form
          id={branchFormId}
          onSubmit={(event) => {
            event.preventDefault();
            void saveBranch();
          }}
        >
          <CapacityLimitFields
            draft={branchDraft}
            setValue={(key, value) => setBranchDraft(key, value)}
          />
        </form>
      </SettingsSection>

      <SettingsSection
        title="Equipos"
        description="Ajusta los límites por equipo. Deja el valor heredado para seguir el default de la sucursal."
      >
        <div class={styles.teamList}>
          {/* Key by teamId: a row stays mounted across revalidation (new
              objects, same id), so a half-typed draft is never reset. */}
          <Key each={props.snapshot().teams} by="teamId">
            {(team) => (
              <TeamPolicyRow team={team} branchDefaults={props.snapshot} />
            )}
          </Key>
        </div>
      </SettingsSection>
    </>
  );
}

export default function CapacityPoliciesPage() {
  const defaults = createAsync(() => capacityPolicyDefaultsQuery(), {
    initialValue: null,
  });

  return (
    <Show when={defaults()}>
      {(snapshot) => <CapacityPoliciesEditor snapshot={snapshot} />}
    </Show>
  );
}
