import { createEventLogsService } from "~/server/event-logs/service";

import type { ServerInfra } from "./infra";

export function createEventLogsRuntime(infra: ServerInfra) {
  return {
    eventLogsService: createEventLogsService(infra.db),
  };
}
