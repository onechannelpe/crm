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
  AppPageSection,
  AppPageSectionTitle,
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
    <AppPage class="space-y-7">
      <AppPageHeader
        eyebrow="Bandeja de ejecución"
        title="Mis leads"
        description={`${currentLeads().length} contactos activos para gestionar en esta sesión.`}
        actions={<RequestLeadsButton onRequest={handleRequestLeads} />}
      />

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div class="space-y-4">
          <AppPageSectionTitle
            title="Cola de trabajo"
            description="Ordena por prioridad de vencimiento"
            class="px-1"
          />
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

        <aside class="space-y-4">
          <Show
            when={quotaValues()}
            fallback={
              <AppPageSection class="p-5">
                <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Cuota diaria
                </p>
                <p class="mt-2 text-xl font-semibold">Sin asignación</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Solicita cuota al supervisor para poder pedir más leads.
                </p>
              </AppPageSection>
            }
          >
            {(values) => (
              <QuotaDisplay used={values().used} total={values().total} />
            )}
          </Show>

          <AppPageSection class="p-5">
            <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Recomendaciones
            </p>
            <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Completa primero los leads con menor tiempo restante.</li>
              <li>Registra ventas al terminar cada llamada efectiva.</li>
              <li>Solicita más leads solo si tu cola activa es baja.</li>
            </ul>
          </AppPageSection>
        </aside>
      </div>
    </AppPage>
  );
}
