import { useNavigate } from "@solidjs/router";
import { createResource, Show } from "solid-js";

import { registerCall, requestLeads, getActiveLeads } from "~/actions/leads";
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

  const handleRegisterCall = async (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes: string,
  ) => {
    await runOptimistic({
      read: currentLeads,
      write: (next) => mutateLeads(() => next),
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        await registerCall(assignmentId, contactId, outcome, notes);
      },
      reconcile: () => {
        void refetchLeads();
      },
    });

    if (outcome === "sale_made") {
      navigate(`/sales/new?contactId=${contactId}`);
    }
  };

  return (
    <AppPage>
      <div class={styles.panelPadded}>
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
            onRegisterCall={handleRegisterCall}
            emptyAction={<RequestLeadsButton onRequest={handleRequestLeads} />}
          />
        </Show>
      </div>
      <div class={styles.fabContainer}>
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>
    </AppPage>
  );
}
