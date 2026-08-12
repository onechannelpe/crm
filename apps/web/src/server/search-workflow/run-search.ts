import type { SearchDirectResult } from "~/contracts/search/results";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import { type DomainError } from "~/domain/errors";
import { SearchReservationId, type UserId } from "~/domain/ids";
import {
  executeWithUsageReservation,
  type UsageReservationPorts,
} from "~/server/capacity/application/usage/ledger";
import type { EngineClient } from "~/server/integrations/engine/client";
import type { OperationContext } from "~/server/platform/operation/context";
import { isErr, Ok, type Result } from "~/shared/result";

export interface RunDirectSearchCommand {
  actorUserId: UserId;
  intent: SearchIntent;
  query: string;
  limit: number;
}

export async function runDirectSearch(
  command: RunDirectSearchCommand,
  usageReservationPorts: UsageReservationPorts<"search">,
  engine: Pick<EngineClient, "search">,
  operation: OperationContext,
): Promise<Result<SearchDirectResult, DomainError>> {
  return executeWithUsageReservation(
    {
      kind: "search",
      actorUserId: command.actorUserId,
      requested: 1,
      reserveReason: "direct_search",
      brand: SearchReservationId.trust,
    },
    usageReservationPorts,
    operation,
    async () => {
      const searchResult = await engine.search(
        command.intent,
        command.query,
        command.limit,
      );
      if (isErr(searchResult)) {
        return searchResult;
      }
      return Ok({ value: { rows: searchResult.value }, consumed: 1 });
    },
  );
}
