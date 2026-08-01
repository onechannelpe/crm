import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { withAdvisoryLock } from "~/server/platform/database/advisory-lock";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { Err, isErr, Ok, type Result } from "~/shared/result";

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
    evaluatedAt: Date,
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
  /** Operation instant. Stamps the reservation and bounds the capacity read. */
  at: Date;
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
      const remaining = await ports.checkRemaining(
        trx,
        command.actorUserId,
        command.at,
      );
      if (isErr(remaining)) return remaining;

      if (remaining.value < command.amount) {
        return Err(fail(EXHAUSTED_CODE[command.kind]));
      }

      const row = await ports.reservations(trx).insert({
        user_id: command.actorUserId,
        amount: command.amount,
        reason: command.reason,
        created_at: command.at,
        updated_at: command.at,
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
  at: Date,
): Promise<Result<void, DomainError>> {
  const reservations = ports.reservations(ports.executor);
  const reservation = await reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await ports.commits(ports.executor).insert({
    reservation_id: reservationId,
    amount,
    created_at: at,
  });
  await reservations.updateAmountAndStatus(
    reservationId,
    amount,
    "committed",
    at,
  );
  return Ok(undefined);
}

async function cancelUsage<K extends CapacityKind>(
  reservationId: UsageReservationId<K>,
  ports: Pick<UsageReservationPorts<K>, "executor" | "reservations">,
  at: Date,
): Promise<Result<void, DomainError>> {
  const reservations = ports.reservations(ports.executor);
  const reservation = await reservations.findById(reservationId);
  if (!reservation) {
    return Err(fail("reservation_not_found"));
  }
  await reservations.updateStatus(reservationId, "cancelled", at);
  return Ok(undefined);
}

export interface ExecuteWithUsageReservationCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  requested: number;
  reserveReason: ReserveReason<K>;
  brand: (id: string) => UsageReservationId<K>;
  /** Operation instant, shared by the reservation and its commit or cancel. */
  at: Date;
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
      at: command.at,
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
    await cancelUsage(reservationId, ports, command.at);
    throw error;
  }

  if (isErr(runResult)) {
    await cancelUsage(reservationId, ports, command.at);
    return runResult;
  }

  const consumed = runResult.value.consumed;
  if (consumed < 0 || consumed > command.requested) {
    await cancelUsage(reservationId, ports, command.at);
    return Err(fail("invalid_consumed_amount"));
  }

  if (consumed === 0) {
    await cancelUsage(reservationId, ports, command.at);
    return Ok(runResult.value.value);
  }

  const commitResult = await commitUsage(
    reservationId,
    consumed,
    ports,
    command.at,
  );
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
    created_at: command.at,
  });
  return Ok(undefined);
}
