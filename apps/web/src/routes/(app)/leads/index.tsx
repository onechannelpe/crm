import { useNavigate } from "@solidjs/router";
import { createResource, Show } from "solid-js";

import { requestLeads, getActiveLeads, completeLead } from "~/actions/leads";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import { runOptimistic } from "~/lib/ui/run-optimistic";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, { mutate: mutateLeads, refetch: refetchLeads }] =
    createResource(
      () => true,
      async () => getActiveLeads(),
      { initialValue: [], ssrLoadFrom: "initial" },
    );
  const currentLeads = () => leads.latest ?? [];

  const handleRequestLeads = async () => {
    const result = await requestLeads();
    void refetchLeads();
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
        void refetchLeads();
      },
    });
  };

  return (
    <AppPage>
      <div class={styles.toolbar}>
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>

      <div class={styles.layout}>
        <Show
          when={!leads.error}
          fallback={
            <EmptyState
              title="Failed to load leads"
              description="Refresh and retry."
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
    </AppPage>
  );
}
