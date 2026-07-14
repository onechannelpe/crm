import type { RouteIcon } from "~/lib/nav/config";

export type DashboardId = "merchant-gpv";

export interface DashboardDescriptor {
  id: DashboardId;
  title: string;
  description: string;
  icon: RouteIcon;
}

export const DASHBOARDS: readonly DashboardDescriptor[] = [
  {
    id: "merchant-gpv",
    title: "GPV de comercios",
    description: "GPV de comercios Culqi por mes, vendedor y cohorte.",
    icon: "dashboards",
  },
] as const;

export function findDashboard(id: string): DashboardDescriptor | undefined {
  return DASHBOARDS.find((dashboard) => dashboard.id === id);
}
