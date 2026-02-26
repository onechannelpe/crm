import { useAction } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";

import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { AppPage } from "~/components/layout/page";
import {
  registerCallMutation,
  requestLeadsMutation,
} from "~/lib/mutations/leads";
import { activeLeadsQuery } from "~/lib/queries/leads";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./leads-page.module.css";

export default function LeadsPage() {
  const navigate = useNavigate();
  const { data: currentLeads, update: updateLeads } = createOptimisticQuery(
    activeLeadsQuery,
    { initialValue: [] },
  );
  const requestLeadsAction = useAction(requestLeadsMutation);
  const registerCallAction = useAction(registerCallMutation);

  const handleRequestLeads = async () => {
    const result = await requestLeadsAction();
    // Do not await: the assigned count is returned immediately so the caller
    // (RequestLeadsButton) can display it without waiting for the list refresh.
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
        await registerCallAction(assignmentId, contactId, outcome, notes);
      },
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
