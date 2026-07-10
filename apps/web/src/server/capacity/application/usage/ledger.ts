import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { withAdvisoryLock } from "~/server/shared/db-lock";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  CapacityKind,
  GrantUsageCapacityCommand,
  ReserveReason,
  UsageCommitsRepo,
  UsageLedgerRepos,
  UsageReservationId,
  UsageReservationsRepo,
} from "../../domain/usage-types";

const EXHAUSTED_CODE = {
  lead: "lead_exhausted",
  search: "search_exhausted",
} as const satisfies Record<CapacityKind, string>;

export interface UsageReservationPorts<K extends CapacityKind> {
  executor: DatabaseExecutor;
  checkRemaining(
    trx: DatabaseExecutor,
    actorUserId: UserId,
  ): Promise<Result<number, DomainError>>;
  reservations(trx: DatabaseExecutor): UsageReservationsRepo<K>;
  commits(trx: DatabaseExecutor): UsageCommitsRepo<K>;
}

interface ReserveUsageCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  amount: number;
  reason: ReserveReason<K>;
  brand: (id: string) => UsageReservationId<K>;
}

// The read (remaining capacity) and the write (the reservation row) must
// happen in the same locked transaction, or two concurrent callers can both
// read "capacity available" before either has inserted. The lock is per
// (kind, user): unrelated users never contend, and the lock releases the
// instant this transaction commits or rolls back.
async function reserveUsage<K extends CapacityKind>(
  command: ReserveUsageCommand<K>,
  ports: Pick<
    UsageReservationPorts<K>,
    "executor" | "checkRemaining" | "reservations"
  >,
): Promise<Result<UsageReservationId<K>, DomainError>> {
  const lockKey = `usage:${command.kind}:${command.actorUserId}`;
  return ports.executor.transaction().execute((trx) =>
    withAdvisoryLock(trx, lockKey, async () => {
      const remaining = await ports.checkRemaining(trx, command.actorUserId);
      if (isErr(remaining)) return remaining;

      if (remaining.value < command.amount) {
        return Err(fail(EXHAUSTED_CODE[command.kind]));
      }

      const row = await ports.reservations(trx).insert({
        user_id: command.actorUserId,
        amount: command.amount,
        reason: command.reason,
      });
      return Ok(command.brand(row.id));
    }),
  );
}

// commit/cancel only ever touch the single row reserveUsage just created for
// this call, so unlike reserveUsage they need no lock
async function commitUsage<K extends CapacityKind>(
  reservationId: UsageReservationId<K>,
  amount: number,
  ports: Pick<
    UsageReservationPorts<K>,
    "executor" | "reservations" | "commits"
  >,
): Promise<Result<void, DomainError>> {
  const reservations = ports.reservations(ports.executor);
  const reservation = await reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await ports.commits(ports.executor).insert({
    reservation_id: reservationId,
    amount,
  });
  await reservations.updateAmountAndStatus(reservationId, amount, "committed");
  return Ok(undefined);
}

async function cancelUsage<K extends CapacityKind>(
  reservationId: UsageReservationId<K>,
  ports: Pick<UsageReservationPorts<K>, "executor" | "reservations">,
): Promise<Result<void, DomainError>> {
  const reservations = ports.reservations(ports.executor);
  const reservation = await reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await reservations.updateStatus(reservationId, "cancelled");
  return Ok(undefined);
}

export interface ExecuteWithUsageReservationCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  requested: number;
  reserveReason: ReserveReason<K>;
  brand: (id: string) => UsageReservationId<K>;
}

export async function executeWithUsageReservation<K extends CapacityKind, T>(
  command: ExecuteWithUsageReservationCommand<K>,
  ports: UsageReservationPorts<K>,
  run: (
    reservationId: UsageReservationId<K>,
  ) => Promise<Result<{ value: T; consumed: number }, DomainError>>,
): Promise<Result<T, DomainError>> {
  const reservationResult = await reserveUsage(
    {
      kind: command.kind,
      actorUserId: command.actorUserId,
      amount: command.requested,
      reason: command.reserveReason,
      brand: command.brand,
    },
    ports,
  );
  if (isErr(reservationResult)) {
    return reservationResult;
  }

  const reservationId = reservationResult.value;

  let runResult: Result<{ value: T; consumed: number }, DomainError>;
  try {
    runResult = await run(reservationId);
  } catch (error) {
    await cancelUsage(reservationId, ports);
    throw error;
  }

  if (isErr(runResult)) {
    await cancelUsage(reservationId, ports);
    return runResult;
  }

  const consumed = runResult.value.consumed;
  if (consumed < 0 || consumed > command.requested) {
    await cancelUsage(reservationId, ports);
    return Err(fail("invalid_consumed_amount"));
  }

  if (consumed === 0) {
    await cancelUsage(reservationId, ports);
    return Ok(runResult.value.value);
  }

  const commitResult = await commitUsage(reservationId, consumed, ports);
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
