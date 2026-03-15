import { createAsync, useAction } from "@solidjs/router";
import { createSignal } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { requestMoreLeadRefillMutation } from "~/lib/mutations/lead-ops";
import { requestMoreSearchesMutation } from "~/lib/mutations/search-access";
import { myLeadCapacityQuery } from "~/lib/queries/lead-ops";
import { mySearchAllowanceQuery } from "~/lib/queries/search-access";

export default function MyCapacityPage() {
  const searchStatus = createAsync(() => mySearchAllowanceQuery());
  const leadStatus = createAsync(() => myLeadCapacityQuery());
  const requestSearches = useAction(requestMoreSearchesMutation);
  const requestRefill = useAction(requestMoreLeadRefillMutation);
  const [searchAmount, setSearchAmount] = createSignal("25");
  const [searchReason, setSearchReason] = createSignal("");
  const [leadAmount, setLeadAmount] = createSignal("10");
  const [leadReason, setLeadReason] = createSignal("");

  return (
    <AppPage width="medium">
      <div class="space-y-8">
        <div>
          <h2 class="text-2xl font-semibold">Mi capacidad</h2>
          <p class="text-sm text-muted-foreground">
            Revisa tus límites efectivos y solicita capacidad adicional.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded border p-4">
            <p class="font-medium">Búsquedas del mes</p>
            <p>
              {searchStatus()?.usedAmount ?? 0}/
              {(searchStatus()?.monthlySearchLimit ?? 0) +
                (searchStatus()?.extraGranted ?? 0)}
            </p>
            <p class="text-sm text-muted-foreground">
              {searchStatus()?.remaining ?? 0} restantes
            </p>
          </div>
          <div class="rounded border p-4">
            <p class="font-medium">Capacidad de leads</p>
            <p>
              {leadStatus()?.activeAssignments ?? 0}/
              {leadStatus()?.activeBufferTarget ?? 0} activos
            </p>
            <p class="text-sm text-muted-foreground">
              {leadStatus()?.remaining ?? 0} refills hoy
            </p>
          </div>
        </div>

        <form
          class="space-y-3 rounded border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void requestSearches(Number(searchAmount()), searchReason());
          }}
        >
          <h3 class="text-lg font-medium">Solicitar más búsquedas</h3>
          <Input
            type="number"
            label="Cantidad"
            value={searchAmount()}
            onInput={(event) => setSearchAmount(event.currentTarget.value)}
            required
          />
          <Input
            label="Motivo"
            value={searchReason()}
            onInput={(event) => setSearchReason(event.currentTarget.value)}
            required
          />
          <Button type="submit">Enviar solicitud</Button>
        </form>

        <form
          class="space-y-3 rounded border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void requestRefill(Number(leadAmount()), leadReason());
          }}
        >
          <h3 class="text-lg font-medium">Solicitar más refills</h3>
          <Input
            type="number"
            label="Cantidad"
            value={leadAmount()}
            onInput={(event) => setLeadAmount(event.currentTarget.value)}
            required
          />
          <Input
            label="Motivo"
            value={leadReason()}
            onInput={(event) => setLeadReason(event.currentTarget.value)}
            required
          />
          <Button type="submit">Enviar solicitud</Button>
        </form>
      </div>
    </AppPage>
  );
}
