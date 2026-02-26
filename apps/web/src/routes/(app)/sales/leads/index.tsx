import { useNavigate } from "@solidjs/router";

import { registerCall, requestLeads } from "~/actions/leads";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { AppPage } from "~/components/layout/page";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const { data: currentLeads, update: updateLeads, invalidate: invalidateLeads } =
    createOptimisticQuery(activeLeadsQuery, { initialValue: [] });

  const handleRequestLeads = async () => {
    const result = await requestLeads();
    void invalidateLeads();
    return result.assigned;
  };

  const handleRegisterCall = async (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes: string,
  ) => {
    await updateLeads({
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        await registerCall(assignmentId, contactId, outcome, notes);
      },
      reconcile: true,
    });

    if (outcome === "sale_made") {
      navigate(`/sales/records/new?contactId=${contactId}`);
    }
  };

  return (
    <AppPage>
      <LeadList
          contacts={currentLeads()}
          onRegisterCall={handleRegisterCall}
          emptyAction={<RequestLeadsButton onRequest={handleRequestLeads} />}
        />
      <div class={styles.fabContainer}>
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>
    </AppPage>
  );
}
