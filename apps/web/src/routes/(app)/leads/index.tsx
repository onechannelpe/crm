import { useNavigate } from "@solidjs/router";
import { createResource, Show } from "solid-js";

import { requestLeads, getActiveLeads, completeLead } from "~/actions/leads";
import { getQuotaStatus } from "~/actions/quota";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { EmptyState } from "~/components/feedback/empty-state";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
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
    <AppPage>
      <AppPageHeader
        eyebrow="Pipeline"
        title="Lead queue"
        description={`${currentLeads().length} active leads currently assigned.`}
        actions={<RequestLeadsButton onRequest={handleRequestLeads} />}
      />

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        <Show
          when={!leads.error}
          fallback={
            <EmptyState title="Failed to load leads" description="Refresh and retry." />
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

        <aside class="space-y-3">
          <Show
            when={quotaValues()}
            fallback={
              <section class="tw-record-index-panel p-4">
                <p class="text-xs text-muted-foreground">
                  Daily quota
                </p>
                <p class="mt-1 text-lg font-medium">Not assigned</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Quota is required before requesting new leads.
                </p>
              </section>
            }
          >
            {(values) => (
              <QuotaDisplay used={values().used} total={values().total} />
            )}
          </Show>
        </aside>
      </div>
    </AppPage>
  );
}
