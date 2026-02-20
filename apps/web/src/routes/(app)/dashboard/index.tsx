import { useNavigate } from "@solidjs/router";
import { Show } from "solid-js";

import { getDashboardStats } from "~/actions/dashboard";
import { getQuotaStatus } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { EmptyState } from "~/components/feedback/empty-state";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
  AppPageSectionTitle,
} from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { hasPermission } from "~/lib/auth/access/rbac";
import { createAppQuery } from "~/lib/ui/create-app-query";

type FocusItem = {
  label: string;
  value: number;
  detail: string;
  cta: string;
  href: string;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const [quota] = createAppQuery(getQuotaStatus, { allocated: false });
  const [stats] = createAppQuery(getDashboardStats, {
    activeLeads: 0,
    pendingSales: 0,
    draftSales: 0,
    approvedSales: 0,
  });

  const quotaValues = () => {
    const current = quota();
    if (!current?.allocated) return null;
    return { used: current.used, total: current.total };
  };

  const focusItems = (): FocusItem[] => {
    const items: FocusItem[] = [];

    if (hasPermission(currentUser().role, "sales:review")) {
      items.push({
        label: "Ventas pendientes",
        value: stats()?.pendingSales ?? 0,
        detail: "Requieren validación para avanzar",
        cta: "Abrir validación",
        href: "/validation",
      });
    }

    items.push(
      {
        label: "Leads activos",
        value: stats()?.activeLeads ?? 0,
        detail: "Contactos disponibles para gestión",
        cta: "Ir a leads",
        href: "/leads",
      },
      {
        label: "Borradores",
        value: stats()?.draftSales ?? 0,
        detail: "Ventas en preparación",
        cta: "Continuar ventas",
        href: "/leads",
      },
    );

    return items;
  };

  const completed = () => stats()?.approvedSales ?? 0;
  const openLoad = () =>
    (stats()?.pendingSales ?? 0) +
    (stats()?.activeLeads ?? 0) +
    (stats()?.draftSales ?? 0);

  return (
    <AppPage class="space-y-7">
      <AppPageHeader
        eyebrow="Operación diaria"
        title="Centro de ejecución"
        description="Prioriza primero pendientes y mantén la cola de leads en flujo."
        actions={
          <Badge variant="outline" class="text-[11px]">
            Vista de hoy
          </Badge>
        }
      />

      <AppPageSection>
        <AppPageSectionTitle
          title="Focos de trabajo"
          description="Orden recomendado de atención"
        />

        <div class="space-y-2">
          {focusItems().map((item) => (
            <div class="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p class="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="min-w-12 text-right text-2xl font-semibold">
                  {item.value}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(item.href)}
                >
                  {item.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AppPageSection>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Show
          when={quotaValues()}
          fallback={
            <div class="crm-surface rounded-3xl p-5">
              <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Cuota diaria
              </p>
              <p class="mt-2 text-2xl font-semibold">Sin cuota asignada</p>
              <p class="mt-1 text-sm text-muted-foreground">
                Solicita asignación al supervisor para habilitar nuevos pedidos
                de leads.
              </p>
            </div>
          }
        >
          {(values) => (
            <QuotaDisplay used={values().used} total={values().total} />
          )}
        </Show>

        <AppPageSection class="p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Estado del pipeline
          </p>
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Aprobadas</span>
              <span class="text-lg font-semibold">{completed()}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Carga abierta</span>
              <span class="text-lg font-semibold">{openLoad()}</span>
            </div>
          </div>
          <div class="mt-4 h-2 rounded-full bg-secondary">
            <div
              class="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (completed() / Math.max(1, completed() + openLoad())) * 100).toFixed(2)}%`,
              }}
            />
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            Proporción de operaciones cerradas frente a carga pendiente.
          </p>
        </AppPageSection>
      </div>

      <Show when={completed() === 0 && openLoad() === 0}>
        <EmptyState
          title="No hay carga operativa activa"
          description="Solicita leads para iniciar la jornada comercial."
        />
      </Show>
    </AppPage>
  );
}
