import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityRequestsRepo } from "./repos";

export interface CreateCapacityRequestCommand {
  userId: UserId;
  kind: "search_extra" | "lead_refill_extra";
  amount: number;
  reason: string;
}

interface RequestRepos {
  capacityRequests: CapacityRequestsRepo;
}

export async function createCapacityRequest(
  command: CreateCapacityRequestCommand,
  repos: RequestRepos,
): Promise<Result<{ success: true }, DomainError>> {
  try {
    await repos.capacityRequests.create({
      user_id: command.userId,
      kind: command.kind,
      status: "pending",
      requested_amount: command.amount,
      reason: command.reason,
    });
    return Ok({ success: true });
  } catch (error) {
    return Err(
      domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Request creation failed"),
    );
  }
}
