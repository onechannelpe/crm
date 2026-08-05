import { createSharedRuntime } from "~/server/composition/shared-runtime";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";

// Keep the maintenance worker free of request-scoped and framework dependencies.
export function createMaintenanceRuntime(infrastructure: ServerInfrastructure) {
  const shared = createSharedRuntime(infrastructure);

  return {
    clientSearch: shared.clientSearch,
    maintenance: shared.maintenance,
    merchantStats: shared.merchantStats,
    notifications: shared.notifications,
  };
}
