import {
  action,
  createAsync,
  query,
  revalidate,
  useNavigate,
} from "@solidjs/router";
import { For, Show } from "solid-js";
import LeadCard from "~/components/leads/lead-card";
import Button from "~/components/shared/button";
import EmptyState from "~/components/shared/empty-state";
import {
  getActiveLeads,
  requestLeads as requestLeadsApi,
} from "~/lib/server/api";

const loadLeads = query(async () => {
  "use server";
  return getActiveLeads();
}, "leads");

const requestLeadsAction = action(async (bufferSize: number) => {
  "use server";
  await requestLeadsApi(bufferSize);
  revalidate("leads");
});

export const route = {
  preload: () => loadLeads(),
};

export default function SearchPage() {
  const navigate = useNavigate();
  const leads = createAsync(() => loadLeads());

  const handleCreateSale = (contactId: number) => {
    navigate(`/sales/new?contactId=${contactId}`);
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Mis Leads</h1>
          <p class="text-sm text-gray-500 mt-1">
            {leads()?.length || 0} leads activos
          </p>
        </div>
        <form
          action={requestLeadsAction as any}
          method="post"
          onSubmit={(e: SubmitEvent) => {
            e.preventDefault();
            requestLeadsAction(10);
          }}
        >
          <Button type="submit">Solicitar leads</Button>
        </form>
      </div>

      <Show
        when={leads()?.length}
        fallback={
          <EmptyState
            title="No hay leads asignados"
            description="Solicita nuevos leads para comenzar a trabajar"
            action={
              <form
                action={requestLeadsAction as any}
                method="post"
                onSubmit={(e: SubmitEvent) => {
                  e.preventDefault();
                  requestLeadsAction(10);
                }}
              >
                <Button type="submit">Solicitar leads</Button>
              </form>
            }
          />
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={leads()}>
            {(assignment) => (
              <LeadCard
                assignment={assignment}
                onCreateSale={handleCreateSale}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
