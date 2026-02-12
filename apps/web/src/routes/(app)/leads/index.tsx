import { createResource, createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { requestLeads } from "~/actions/leads";
import { getQuotaStatus } from "~/actions/quota";
import { LeadList } from "~/components/features/leads/lead-list";
import { RequestLeadsButton } from "~/components/features/leads/request-leads-button";
import { QuotaDisplay } from "~/components/features/quota/quota-display";

export default function LeadsPage() {
    const navigate = useNavigate();
    const [quota, { refetch: refetchQuota }] = createResource(getQuotaStatus);

    // TODO: wire up actual lead fetching once getActiveLeads action exists
    const [leads] = createSignal<any[]>([]);

    const handleRequestLeads = async () => {
        await requestLeads();
        refetchQuota();
    };

    const handleCreateSale = (contactId: number) => {
        navigate(`/sales/new?contactId=${contactId}`);
    };

    const handleComplete = async (_contactId: number) => {
        // TODO: wire up completeLead action
    };

    return (
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Mis Leads</h1>
                    <p class="text-sm text-gray-500 mt-1">
                        {leads().length} leads activos
                    </p>
                </div>
                <RequestLeadsButton onRequest={handleRequestLeads} />
            </div>

            <Show when={quota()?.allocated}>
                <QuotaDisplay
                    used={(quota() as any).used ?? 0}
                    total={(quota() as any).total ?? 10}
                />
            </Show>

            <LeadList
                contacts={leads()}
                onCreateSale={handleCreateSale}
                onComplete={handleComplete}
            />
        </div>
    );
}
