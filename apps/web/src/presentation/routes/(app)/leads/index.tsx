import { createAsync, useNavigate } from "@solidjs/router";
import { LeadList } from "~/presentation/features/leads/lead-list";
import { RequestLeadsButton } from "~/presentation/features/leads/request-leads-button";
import { getActiveLeads, requestLeads, completeLead } from "~/presentation/actions/leads";

export default function LeadsPage() {
  const navigate = useNavigate();
  const leads = createAsync(() => getActiveLeads());

  const handleRequestLeads = async () => {
    await requestLeads();
  };

  const handleCreateSale = (contactId: number) => {
    navigate(`/sales/new?contactId=${contactId}`);
  };

  const handleComplete = async (contactId: number) => {
    await completeLead(contactId);
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
        <RequestLeadsButton onRequest={handleRequestLeads} />
      </div>

      <LeadList
        contacts={leads() || []}
        onCreateSale={handleCreateSale}
        onComplete={handleComplete}
      />
    </div>
  );
}
