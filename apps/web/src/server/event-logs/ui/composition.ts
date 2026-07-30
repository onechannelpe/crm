import { createEventLogsService } from "~/server/event-logs/service";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createEventLogsComposition(infra: ServerInfrastructure) {
  return {
    eventLogsService: createEventLogsService(infra.db),
  };
}

export function composeEventLogs() {
  return createEventLogsComposition(serverInfrastructure);
}
