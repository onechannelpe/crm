import { useNavigate } from "@solidjs/router";
import { Show } from "solid-js";

import { getDashboardStats } from "~/actions/dashboard";
import { getQuotaStatus } from "~/actions/quota";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { EmptyState } from "~/components/feedback/empty-state";
import { useSession } from "~/components/providers/session-provider";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
    <div class="space-y-7">
      <section class="crm-surface rounded-3xl p-6 md:p-7">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Operación diaria
            </p>
            <h1 class="mt-1 text-3xl font-semibold text-foreground md:text-4xl">
              Centro de ejecución
            </h1>
            <p class="mt-2 max-w-[680px] text-sm text-muted-foreground md:text-base">
              Prioriza primero pendientes y mantén la cola de leads en flujo.
            </p>
          </div>
          <Badge variant="outline" class="text-[11px]">
            Vista de hoy
          </Badge>
        </div>
      </section>

      <section class="crm-surface rounded-3xl p-4 md:p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Focos de trabajo
          </h2>
          <p class="text-xs text-muted-foreground">
            Orden recomendado de atención
          </p>
        </div>

        <div class="space-y-2">
          {focusItems().map((item) => (
            <div class="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
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
      </section>

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

        <section class="crm-surface rounded-3xl p-5">
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
        </section>
      </div>

      <Show when={completed() === 0 && openLoad() === 0}>
        <EmptyState
          title="No hay carga operativa activa"
          description="Solicita leads para iniciar la jornada comercial."
        />
      </Show>
    </div>
  );
}
