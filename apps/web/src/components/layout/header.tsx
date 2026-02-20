import { useLocation } from "@solidjs/router";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import { HeaderNotificationsPanel } from "~/components/layout/header-notifications-panel";
import { HeaderSearchPanel } from "~/components/layout/header-search-panel";
import { useSession } from "~/components/providers/session-provider";
import { Button } from "~/components/ui/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  leads: "Leads",
  "client-search": "Búsqueda de clientes",
  quota: "Cuota",
  validation: "Validación",
  inventory: "Inventario",
  team: "Equipo",
  settings: "Configuración",
  profile: "Perfil",
  sales: "Ventas",
};

export function Header() {
  const { currentUser } = useSession();
  const location = useLocation();
  const currentLabel = () => {
    const segment =
      location.pathname.split("/").filter(Boolean)[0] ?? "dashboard";
    return ROUTE_LABELS[segment] ?? "Plataforma";
  };

  return (
    <header
      class="sticky top-0 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur md:px-8"
      style={{ "z-index": DS_Z_INDEX.sticky }}
    >
      <div class="mx-auto flex w-full max-w-[1200px] items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <span class="rounded-full border border-border/80 bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            CRM
          </span>
          <span>/</span>
          <span class="font-medium text-foreground">{currentLabel()}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <HeaderSearchPanel role={currentUser().role} />
          <HeaderNotificationsPanel />
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground md:hidden"
          >
            <CircleQuestionMark class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
