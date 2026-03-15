import { createAsync, useAction } from "@solidjs/router";
import { For, Show, createEffect, createSignal } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { updateLeadScopeDefaultMutation } from "~/lib/mutations/lead-ops";
import { updateSearchScopeDefaultMutation } from "~/lib/mutations/search-access";
import { salesPolicyDefaultsQuery } from "~/lib/queries/team-admin";

export default function SalesPoliciesPage() {
  const defaults = createAsync(() => salesPolicyDefaultsQuery(), {
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
    <AppPage width="full">
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
                  <div class="rounded border p-4 space-y-4">
                    <div>
                      <div class="font-medium">{team.teamName}</div>
                      <div class="text-sm text-muted-foreground">
                        Búsquedas:{" "}
                        {team.searchLimit ?? "usa default de sucursal"} |
                        Buffer: {team.activeBufferTarget ?? "usa default"} |
                        Refill: {team.dailyRefillLimit ?? "usa default"}
                      </div>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2">
                      <form
                        class="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(
                            event.currentTarget as HTMLFormElement,
                          );
                          void updateSearchDefault({
                            scopeType: "team",
                            scopeId: team.teamId,
                            monthlySearchLimit: Number(
                              formData.get("monthlySearchLimit"),
                            ),
                          });
                        }}
                      >
                        <Input
                          type="number"
                          name="monthlySearchLimit"
                          label="Límite mensual"
                          defaultValue={String(
                            team.searchLimit ??
                              snapshot.branchSearchLimit ??
                              250,
                          )}
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
                          const formData = new FormData(
                            event.currentTarget as HTMLFormElement,
                          );
                          void updateLeadDefault({
                            scopeType: "team",
                            scopeId: team.teamId,
                            activeBufferTarget: Number(
                              formData.get("activeBufferTarget"),
                            ),
                            dailyRefillLimit: Number(
                              formData.get("dailyRefillLimit"),
                            ),
                          });
                        }}
                      >
                        <Input
                          type="number"
                          name="activeBufferTarget"
                          label="Buffer activo"
                          defaultValue={String(
                            team.activeBufferTarget ??
                              snapshot.branchActiveBufferTarget ??
                              10,
                          )}
                          required
                        />
                        <Input
                          type="number"
                          name="dailyRefillLimit"
                          label="Refill diario"
                          defaultValue={String(
                            team.dailyRefillLimit ??
                              snapshot.branchDailyRefillLimit ??
                              25,
                          )}
                          required
                        />
                        <Button type="submit" variant="outline">
                          Guardar leads
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </For>
            </section>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
