import type { SearchDirectResult } from "~/contracts/search/results";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import {
  executeWithUsageReservation,
  type UsageReservationPorts,
} from "~/server/capacity/application/usage/ledger";
import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import { asSearchReservationId, type UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

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
): Promise<Result<SearchDirectResult, DomainError>> {
  return executeWithUsageReservation(
    {
      kind: "search",
      actorUserId: command.actorUserId,
      requested: 1,
      reserveReason: "direct_search",
      brand: asSearchReservationId,
    },
    usageReservationPorts,
    async () => {
      const searchResult = await engine.search(
        command.intent,
        command.query,
        command.limit,
      );
      if (isErr(searchResult)) return searchResult;
      return Ok({ value: { rows: searchResult.value }, consumed: 1 });
    },
  );
}
