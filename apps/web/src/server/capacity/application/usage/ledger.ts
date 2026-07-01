import { fail, type DomainError } from "~/server/shared/domain-error";
import { asLeadReservationId, asSearchReservationId } from "~/server/shared/ids";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  CancelReason,
  CapacityKind,
  GrantUsageCapacityCommand,
  ReserveReason,
  UsageLedgerRepos,
  UsageReservationId,
} from "../../domain/usage-types";

const EXHAUSTED_CODE: Record<CapacityKind, string> = {
  lead: "lead_exhausted",
  search: "search_exhausted",
};

function brandReservationId<K extends CapacityKind>(
  kind: K,
  id: string,
): UsageReservationId<K> {
  return (
    kind === "lead" ? asLeadReservationId(id) : asSearchReservationId(id)
  ) as UsageReservationId<K>;
}

interface ReserveUsageCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  amount: number;
  remainingCapacity: number;
  reason: ReserveReason<K>;
}

async function reserveUsage<K extends CapacityKind>(
  command: ReserveUsageCommand<K>,
  repos: Pick<UsageLedgerRepos<K>, "reservations">,
): Promise<Result<UsageReservationId<K>, DomainError>> {
  if (command.remainingCapacity < command.amount) {
    return Err(fail(EXHAUSTED_CODE[command.kind]));
  }
  const row = await repos.reservations.insert({
    user_id: command.actorUserId,
    amount: command.amount,
    reason: command.reason,
  });
  return Ok(brandReservationId(command.kind, row.id));
}

async function commitUsage<K extends CapacityKind>(
  reservationId: UsageReservationId<K>,
  amount: number,
  repos: Pick<UsageLedgerRepos<K>, "reservations" | "commits">,
): Promise<Result<void, DomainError>> {
  const reservation = await repos.reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await repos.commits.insert({ reservation_id: reservationId, amount });
  await repos.reservations.updateAmountAndStatus(
    reservationId,
    amount,
    "committed",
  );
  return Ok(undefined);
}

async function cancelUsage<K extends CapacityKind>(
  reservationId: UsageReservationId<K>,
  repos: Pick<UsageLedgerRepos<K>, "reservations">,
): Promise<Result<void, DomainError>> {
  const reservation = await repos.reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await repos.reservations.updateStatus(reservationId, "cancelled");
  return Ok(undefined);
}

export interface ExecuteWithUsageReservationCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  requested: number;
  remainingCapacity: number;
  reserveReason: ReserveReason<K>;
  failureReason: CancelReason;
}

// Single public entry point for "reserve capacity, do side-effecting work,
// then settle" across both lead and search usage. The raw reserve/commit/
// cancel steps above are private on purpose: nothing can reserve without
// also being forced through this try/catch-and-cancel-on-throw path, which
// is what a hand-rolled inline choreography (see the old
// server/search-workflow/run-search.ts) would otherwise skip.
export async function executeWithUsageReservation<K extends CapacityKind, T>(
  command: ExecuteWithUsageReservationCommand<K>,
  repos: Pick<UsageLedgerRepos<K>, "reservations" | "commits">,
  run: (
    reservationId: UsageReservationId<K>,
  ) => Promise<Result<{ value: T; consumed: number }, DomainError>>,
): Promise<Result<T, DomainError>> {
  const reservationResult = await reserveUsage(
    {
      kind: command.kind,
      actorUserId: command.actorUserId,
      amount: command.requested,
      remainingCapacity: command.remainingCapacity,
      reason: command.reserveReason,
    },
    repos,
  );
  if (isErr(reservationResult)) {
    return reservationResult;
  }

  const reservationId = reservationResult.value;

  let runResult: Result<{ value: T; consumed: number }, DomainError>;
  try {
    runResult = await run(reservationId);
  } catch (error) {
    await cancelUsage(reservationId, repos);
    throw error;
  }

  if (isErr(runResult)) {
    await cancelUsage(reservationId, repos);
    return runResult;
  }

  const consumed = runResult.value.consumed;
  if (consumed === 0) {
    await cancelUsage(reservationId, repos);
    return Ok(runResult.value.value);
  }

  const commitResult = await commitUsage(reservationId, consumed, repos);
  if (isErr(commitResult)) {
    return commitResult;
  }

  return Ok(runResult.value.value);
}

export async function grantUsageCapacity<K extends CapacityKind>(
  command: GrantUsageCapacityCommand<K>,
  repos: Pick<UsageLedgerRepos<K>, "grants">,
): Promise<Result<void, DomainError>> {
  await repos.grants.insert({
    user_id: command.targetUserId,
    amount: command.amount,
    reason: command.reason,
    actor_user_id: command.actorUserId,
  });
  return Ok(undefined);
}
