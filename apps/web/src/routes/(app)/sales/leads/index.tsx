import { useNavigate } from "@solidjs/router";

import { registerCall, requestLeads } from "~/actions/leads";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { AppPage } from "~/components/layout/page";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const {
    data: currentLeads,
    write: writeLeads,
    revalidate: revalidateLeads,
  } = createOptimisticQuery(() => activeLeadsQuery(), {
    initialValue: [],
    key: activeLeadsQuery.key,
  });

  const handleRequestLeads = async () => {
    const result = await requestLeads();
    void revalidateLeads();
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
      write: writeLeads,
      optimistic: (prev) =>
        prev.filter((lead) => lead.assignmentId !== assignmentId),
      commit: async () => {
        await registerCall(assignmentId, contactId, outcome, notes);
      },
reconcile: revalidateLeads,
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
