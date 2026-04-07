import { createAsync, useAction } from "@solidjs/router";
import { For, Show, createEffect, createSignal } from "solid-js";

import type { CapacityPolicyTeamDefaultsView } from "~/actions/capacity/contracts";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  updateLeadScopeDefaultMutation,
  updateSearchScopeDefaultMutation,
} from "~/lib/mutations/capacity";
import { capacityPolicyDefaultsQuery } from "~/lib/queries/capacity";

interface TeamPolicyRowProps {
  team: CapacityPolicyTeamDefaultsView;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  onUpdateSearchDefault: (input: {
    scopeType: "team";
    scopeId: number;
    monthlySearchLimit: number;
  }) => Promise<unknown>;
  onUpdateLeadDefault: (input: {
    scopeType: "team";
    scopeId: number;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  }) => Promise<unknown>;
}

function TeamPolicyRow(props: TeamPolicyRowProps) {
  const [teamSearchLimit, setTeamSearchLimit] = createSignal(
    String(props.team.searchLimit ?? props.branchSearchLimit ?? 250),
  );
  const [teamBufferTarget, setTeamBufferTarget] = createSignal(
    String(
      props.team.activeBufferTarget ?? props.branchActiveBufferTarget ?? 10,
    ),
  );
  const [teamDailyRefill, setTeamDailyRefill] = createSignal(
    String(props.team.dailyRefillLimit ?? props.branchDailyRefillLimit ?? 25),
  );

  const [isSearchDirty, setIsSearchDirty] = createSignal(false);
  const [isLeadDirty, setIsLeadDirty] = createSignal(false);

  createEffect(() => {
    if (isSearchDirty()) return;
    setTeamSearchLimit(
      String(props.team.searchLimit ?? props.branchSearchLimit ?? 250),
    );
  });

  createEffect(() => {
    if (isLeadDirty()) return;
    setTeamBufferTarget(
      String(
        props.team.activeBufferTarget ?? props.branchActiveBufferTarget ?? 10,
      ),
    );
    setTeamDailyRefill(
      String(props.team.dailyRefillLimit ?? props.branchDailyRefillLimit ?? 25),
    );
  });

  return (
    <div class="rounded border p-4 space-y-4">
      <div>
        <div class="font-medium">{props.team.teamName}</div>
        <div class="text-sm text-muted-foreground">
          Búsquedas: {props.team.searchLimit ?? "usa default de sucursal"} |
          Buffer: {props.team.activeBufferTarget ?? "usa default"} | Refill:{" "}
          {props.team.dailyRefillLimit ?? "usa default"}
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <form
          class="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onUpdateSearchDefault({
              scopeType: "team",
              scopeId: props.team.teamId,
              monthlySearchLimit: Number(teamSearchLimit()),
            });
            setIsSearchDirty(false);
          }}
        >
          <Input
            type="number"
            label="Límite mensual"
            value={teamSearchLimit()}
            onInput={(event) => {
              setIsSearchDirty(true);
              setTeamSearchLimit(event.currentTarget.value);
            }}
            required
          />
          <Button type="submit" variant="outline">
            Guardar búsquedas
          </Button>
        </form>

        <form
          class="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onUpdateLeadDefault({
              scopeType: "team",
              scopeId: props.team.teamId,
              activeBufferTarget: Number(teamBufferTarget()),
              dailyRefillLimit: Number(teamDailyRefill()),
            });
            setIsLeadDirty(false);
          }}
        >
          <Input
            type="number"
            label="Buffer activo"
            value={teamBufferTarget()}
            onInput={(event) => {
              setIsLeadDirty(true);
              setTeamBufferTarget(event.currentTarget.value);
            }}
            required
          />
          <Input
            type="number"
            label="Refill diario"
            value={teamDailyRefill()}
            onInput={(event) => {
              setIsLeadDirty(true);
              setTeamDailyRefill(event.currentTarget.value);
            }}
            required
          />
          <Button type="submit" variant="outline">
            Guardar leads
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function CapacityPoliciesPage() {
  const defaults = createAsync(() => capacityPolicyDefaultsQuery(), {
    initialValue: null,
  });
  const updateSearchDefault = useAction(updateSearchScopeDefaultMutation);
  const updateLeadDefault = useAction(updateLeadScopeDefaultMutation);
  const [branchSearchLimit, setBranchSearchLimit] = createSignal("250");
  const [branchBufferTarget, setBranchBufferTarget] = createSignal("10");
  const [branchDailyRefill, setBranchDailyRefill] = createSignal("25");

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

  return (
    <AppPage width="wide">
      <Show when={defaults()} keyed>
        {(snapshot) => (
          <div class="space-y-8">
            <div>
              <h2 class="text-2xl font-semibold">Políticas comerciales</h2>
              <p class="text-sm text-muted-foreground">
                Define defaults de búsquedas y leads por sucursal y equipo.
              </p>
            </div>

            <div class="grid gap-6 md:grid-cols-2">
              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateSearchDefault({
                    scopeType: "branch",
                    scopeId: snapshot.branchId,
                    monthlySearchLimit: Number(branchSearchLimit()),
                  });
                }}
              >
                <h3 class="text-lg font-medium">Default de búsquedas</h3>
                <Input
                  type="number"
                  label="Límite mensual de sucursal"
                  value={branchSearchLimit()}
                  onInput={(event) =>
                    setBranchSearchLimit(event.currentTarget.value)
                  }
                  required
                />
                <Button type="submit">Guardar</Button>
              </form>

              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateLeadDefault({
                    scopeType: "branch",
                    scopeId: snapshot.branchId,
                    activeBufferTarget: Number(branchBufferTarget()),
                    dailyRefillLimit: Number(branchDailyRefill()),
                  });
                }}
              >
                <h3 class="text-lg font-medium">Default de leads</h3>
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
                <Button type="submit">Guardar</Button>
              </form>
            </div>

            <section class="space-y-3">
              <h3 class="text-lg font-medium">Equipos</h3>
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
            </section>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
