import type {
  LeadReservationId,
  SearchReservationId,
  UserId,
} from "~/domain/ids";
import type { CapacityKind } from "~/server/capacity/domain/types";

export type { CapacityKind };

export type UsageReservationId<K extends CapacityKind> = K extends "lead"
  ? LeadReservationId
  : SearchReservationId;

export type ReserveReason<K extends CapacityKind> = K extends "lead"
  ? "lead_refill" | "admin_grant_adjustment"
  : "direct_search" | "admin_grant_adjustment";

export interface UsageReservationsRepo<K extends CapacityKind> {
  insert(values: {
    user_id: UserId;
    amount: number;
    reason: string;
  }): Promise<{ id: string }>;
  findById(id: UsageReservationId<K>): Promise<unknown>;
  updateStatus(
    id: UsageReservationId<K>,
    status: "committed" | "cancelled" | "expired",
  ): Promise<void>;
  updateAmountAndStatus(
    id: UsageReservationId<K>,
    amount: number,
    status: "committed" | "cancelled" | "expired",
  ): Promise<void>;
}

export interface UsageCommitsRepo<K extends CapacityKind> {
  insert(values: {
    reservation_id: UsageReservationId<K>;
    amount: number;
  }): Promise<void>;
}

export interface UsageGrantsRepo {
  insert(values: {
    user_id: UserId;
    amount: number;
    reason: string;
    actor_user_id: UserId;
  }): Promise<void>;
}

export interface UsageLedgerRepos<K extends CapacityKind> {
  reservations: UsageReservationsRepo<K>;
  commits: UsageCommitsRepo<K>;
  grants: UsageGrantsRepo;
}

export interface GrantUsageCapacityCommand<K extends CapacityKind> {
  kind: K;
  actorUserId: UserId;
  targetUserId: UserId;
  amount: number;
  reason: string;
}
