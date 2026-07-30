import { createEventLogsService } from "~/server/event-logs/service";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createEventLogsComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  return {
    eventLogsService: createEventLogsService(serverInfrastructure.db),
  };
}

export function composeEventLogs() {
  return createEventLogsComposition(serverInfrastructure);
}
