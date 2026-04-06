import { createAsync, useAction, useParams } from "@solidjs/router";
import { createEffect, createSignal, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  grantMoreLeadRefillMutation,
  grantMoreSearchesMutation,
  updateLeadPolicyOverrideMutation,
  updateSearchPolicyOverrideMutation,
} from "~/lib/mutations/capacity";
import { executiveCapacityDetailQuery } from "~/lib/queries/capacity";

export default function TeamMemberCapacityPage() {
  const params = useParams();
  const userId = () => Number(params.userId);
  const detail = createAsync(() => executiveCapacityDetailQuery(userId()), {
    initialValue: null,
  });
  const grantSearches = useAction(grantMoreSearchesMutation);
  const grantRefill = useAction(grantMoreLeadRefillMutation);
  const updateSearchOverride = useAction(updateSearchPolicyOverrideMutation);
  const updateLeadOverride = useAction(updateLeadPolicyOverrideMutation);
  const [searchGrant, setSearchGrant] = createSignal("25");
  const [leadGrant, setLeadGrant] = createSignal("10");
  const [searchLimit, setSearchLimit] = createSignal("250");
  const [bufferTarget, setBufferTarget] = createSignal("10");
  const [dailyRefillLimit, setDailyRefillLimit] = createSignal("25");

  createEffect(() => {
    const snapshot = detail();
    if (!snapshot) return;
    setSearchLimit(String(snapshot.searchStatus.policy.monthlyLimit));
    setBufferTarget(String(snapshot.leadStatus.policy.bufferTarget));
    setDailyRefillLimit(String(snapshot.leadStatus.policy.dailyLimit));
  });

  return (
    <AppPage width="wide">
      <Show when={detail()} keyed>
        {(snapshot) => (
          <div class="space-y-8">
            <div>
              <h2 class="text-2xl font-semibold">
                {snapshot.executive.fullName}
              </h2>
              <p class="text-sm text-muted-foreground">
                {snapshot.executive.email}
              </p>
            </div>

            <section class="space-y-3">
              <h3 class="text-lg font-medium">Política efectiva</h3>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded border p-4">
                  <p class="font-medium">Búsquedas</p>
                  <p>{snapshot.searchStatus.policy.monthlyLimit} por mes</p>
                  <p class="text-sm text-muted-foreground">
                    Fuente: {snapshot.searchStatus.policy.source}
                  </p>
                </div>
                <div class="rounded border p-4">
                  <p class="font-medium">Leads</p>
                  <p>
                    Buffer {snapshot.leadStatus.policy.bufferTarget} · Refill
                    diario {snapshot.leadStatus.policy.dailyLimit}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Fuente: {snapshot.leadStatus.policy.source}
                  </p>
                </div>
              </div>
            </section>

            <section class="space-y-3">
              <h3 class="text-lg font-medium">Estado actual</h3>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded border p-4">
                  <p class="font-medium">Búsquedas del mes</p>
                  <p>
                    {snapshot.searchStatus.committed}/
                    {snapshot.searchStatus.policy.monthlyLimit +
                      snapshot.searchStatus.granted}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {snapshot.searchStatus.remaining} restantes
                  </p>
                </div>
                <div class="rounded border p-4">
                  <p class="font-medium">Capacidad de leads</p>
                  <p>
                    {snapshot.leadStatus.activeAssignments}/
                    {snapshot.leadStatus.policy.bufferTarget} activos
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {snapshot.leadStatus.remaining} refills disponibles hoy
                  </p>
                </div>
              </div>
            </section>

            <section class="grid gap-6 md:grid-cols-2">
              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void grantSearches(
                    snapshot.executive.id,
                    Number(searchGrant()),
                    "Ajuste manual",
                  );
                }}
              >
                <h3 class="text-lg font-medium">Otorgar más búsquedas</h3>
                <Input
                  type="number"
                  label="Cantidad extra"
                  value={searchGrant()}
                  onInput={(event) => setSearchGrant(event.currentTarget.value)}
                  required
                />
                <Button type="submit">Otorgar</Button>
              </form>

              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void grantRefill(
                    snapshot.executive.id,
                    Number(leadGrant()),
                    "Ajuste manual",
                  );
                }}
              >
                <h3 class="text-lg font-medium">Otorgar más refills</h3>
                <Input
                  type="number"
                  label="Cantidad extra"
                  value={leadGrant()}
                  onInput={(event) => setLeadGrant(event.currentTarget.value)}
                  required
                />
                <Button type="submit">Otorgar</Button>
              </form>
            </section>

            <section class="grid gap-6 md:grid-cols-2">
              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateSearchOverride({
                    userId: snapshot.executive.id,
                    monthlySearchLimit: Number(searchLimit()),
                    expiresAt: null,
                  });
                }}
              >
                <h3 class="text-lg font-medium">Override de búsquedas</h3>
                <Input
                  type="number"
                  label="Límite mensual"
                  value={searchLimit()}
                  onInput={(event) => setSearchLimit(event.currentTarget.value)}
                  required
                />
                <Button type="submit">Guardar override</Button>
              </form>

              <form
                class="space-y-3 rounded border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateLeadOverride({
                    userId: snapshot.executive.id,
                    activeBufferTarget: Number(bufferTarget()),
                    dailyRefillLimit: Number(dailyRefillLimit()),
                    expiresAt: null,
                  });
                }}
              >
                <h3 class="text-lg font-medium">Override de leads</h3>
                <Input
                  type="number"
                  label="Buffer activo"
                  value={bufferTarget()}
                  onInput={(event) =>
                    setBufferTarget(event.currentTarget.value)
                  }
                  required
                />
                <Input
                  type="number"
                  label="Refill diario"
                  value={dailyRefillLimit()}
                  onInput={(event) =>
                    setDailyRefillLimit(event.currentTarget.value)
                  }
                  required
                />
                <Button type="submit">Guardar override</Button>
              </form>
            </section>

            <section class="space-y-3">
              <h3 class="text-lg font-medium">Historial de solicitudes</h3>
              <Show
                when={snapshot.requests.length > 0}
                fallback={
                  <p class="text-sm text-muted-foreground">
                    Sin solicitudes registradas.
                  </p>
                }
              >
                <div class="space-y-2">
                  {snapshot.requests.map((request) => (
                    <div class="rounded border p-3">
                      <div class="font-medium">
                        {request.kind === "search_extra"
                          ? "Más búsquedas"
                          : "Más refills"}{" "}
                        request.requestedAmount
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {request.status} · {request.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </Show>
            </section>
          </div>
        )}
      </Show>
    </AppPage>
  );
}
