import { useNavigate } from "@solidjs/router";
import { createResource, Show } from "solid-js";

import { requestLeads, getActiveLeads, completeLead } from "~/actions/leads";
import { getQuotaStatus } from "~/actions/quota";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { EmptyState } from "~/components/feedback/empty-state";
import { runOptimistic } from "~/lib/ui/run-optimistic";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [quota, { refetch: refetchQuota }] = createResource(
    () => true,
    async () => getQuotaStatus(),
    { initialValue: { allocated: false }, ssrLoadFrom: "initial" },
  );
  const currentQuota = () => quota.latest ?? { allocated: false };
  const [leads, { mutate: mutateLeads, refetch: refetchLeads }] =
    createResource(
      () => true,
      async () => getActiveLeads(),
      { initialValue: [], ssrLoadFrom: "initial" },
    );
  const currentLeads = () => leads.latest ?? [];
  const quotaValues = () => {
    const current = currentQuota();
    if (!current?.allocated) return null;
    return { used: current.used, total: current.total };
  };

  const handleRequestLeads = async () => {
    const result = await requestLeads();
    void Promise.all([refetchQuota(), refetchLeads()]);
    return result.assigned;
  };

  const handleCreateSale = (contactId: number) => {
    navigate(`/sales/new?contactId=${contactId}`);
  };

  const handleComplete = async (assignmentId: number) => {
    await runOptimistic({
      read: currentLeads,
      write: (next) => mutateLeads(() => next),
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        await completeLead(assignmentId);
      },
      reconcile: () => {
        void Promise.all([refetchLeads(), refetchQuota()]);
      },
    });
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Mis leads</h1>
          <p class="text-sm text-gray-500 mt-1">
            {currentLeads().length} leads activos
          </p>
        </div>
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>

      <Show when={quotaValues()}>
        {(values) => (
          <QuotaDisplay used={values().used} total={values().total} />
        )}
      </Show>

      <Show
        when={!leads.error}
        fallback={
          <EmptyState
            title="No se pudieron cargar los leads"
            description="Recarga la pagina para intentar nuevamente."
          />
        }
      >
        <LeadList
          contacts={currentLeads()}
          onCreateSale={handleCreateSale}
          onComplete={(assignmentId) => {
            void handleComplete(assignmentId);
          }}
        />
      </Show>
    </div>
  );
}
