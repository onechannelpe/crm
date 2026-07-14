import type { RouteIcon } from "~/lib/nav/config";

// Dashboards are a first-class object with an index and a show page, mirroring
// records. The set is code-defined (authored by the product team), not
// user-composed, so the registry is a static list rather than metadata rows.
// Add a dashboard by appending a descriptor here and a case in the show route.
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
