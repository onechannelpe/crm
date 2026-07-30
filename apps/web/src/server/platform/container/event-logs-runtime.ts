import { createEventLogsService } from "~/server/event-logs/service";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createEventLogsRuntime(infra: ServerInfra) {
  return {
    eventLogsService: createEventLogsService(infra.db),
  };
}

export const getEventLogsRuntime = memo(() => createEventLogsRuntime(infra));
