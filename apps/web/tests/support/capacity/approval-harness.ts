import type { InsertResult } from "kysely";

import type { Role } from "~/lib/auth/access/rbac";
import { approveCapacityRequest } from "~/server/capacity/application/use-cases/approve-capacity-request";
import type { AppContext } from "~/server/shared/action-runtime";

export const ACTOR_USER_ID = 99;
export const TARGET_USER_ID = 1;
export const REQUEST_ID = 42;

export type RequestRow = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requestedAmount: number;
  reason: string;
  decidedByUserId?: number | null;
  decisionNote?: string | null;
};

type GrantRow = {
  userId: number;
  amount: number;
  reason: string;
  actorUserId: number;
};

type ManagedUser = {
  role: Role;
  branchId: number;
  teamId: number | null;
};

export function makeContext(role: Role = "admin"): AppContext {
  return {
    actor: {
      id: "test-session",
      userId: ACTOR_USER_ID,
      role,
      branchId: 1,
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    requestId: "req-test",
    traceId: "trace-test",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost:3000",
    now: () => 1_700_000_000_000,
  };
}

export function makeApprovalHarness(input: {
  request: RequestRow | undefined;
  targetUser?: ManagedUser | undefined;
  failMarkApproved?: boolean;
}) {
  type ApprovalDeps = Parameters<typeof approveCapacityRequest>[1];
  type ApprovalTx = Parameters<Parameters<ApprovalDeps["uow"]["run"]>[0]>[0];

  let request = input.request ? { ...input.request } : undefined;
  let searchGrants: GrantRow[] = [];
  let leadGrants: GrantRow[] = [];
  let transactionCalls = 0;

  const buildTxPort = () => {
    const draftRequest = request ? { ...request } : undefined;
    const draftSearchGrants = [...searchGrants];
    const draftLeadGrants = [...leadGrants];

    const tx: ApprovalTx = {
      users: {
        findById: async (id: number) =>
          id === input.request?.userId && input.targetUser
            ? {
                id,
                role: input.targetUser.role,
                branchId: input.targetUser.branchId,
                teamId: input.targetUser.teamId,
              }
            : undefined,
      },
      capacityRequests: {
        findById: async (id: number) =>
          draftRequest?.id === id
            ? {
                id: draftRequest.id,
                user_id: draftRequest.userId,
                kind: draftRequest.kind,
                status: draftRequest.status,
                requested_amount: draftRequest.requestedAmount,
                reason: draftRequest.reason,
                reviewer_user_id: draftRequest.decidedByUserId ?? null,
                decision_note: draftRequest.decisionNote ?? null,
              }
            : undefined,
        markApproved: async (
          id: number,
          actorUserId: number,
          note: string | null,
        ) => {
          if (input.failMarkApproved) {
            throw new Error("db connection lost");
          }
          if (!draftRequest || draftRequest.id !== id) {
            return { numUpdatedRows: BigInt(0) };
          }
          draftRequest.status = "approved";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return { numUpdatedRows: BigInt(1) };
        },
        markRejected: async (
          id: number,
          actorUserId: number,
          note: string | null,
        ) => {
          if (!draftRequest || draftRequest.id !== id) {
            return { numUpdatedRows: BigInt(0) };
          }
          draftRequest.status = "rejected";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return { numUpdatedRows: BigInt(1) };
        },
      },
      searchCapacityGrants: {
        insert: async (values: {
          user_id: number;
          amount: number;
          reason: string;
          actor_user_id: number;
        }) => {
          draftSearchGrants.push({
            userId: values.user_id,
            amount: values.amount,
            reason: values.reason,
            actorUserId: values.actor_user_id,
          });
        },
        findByUserAndPeriod: async () => [],
      },
      leadCapacityGrants: {
        insert: async (values: {
          user_id: number;
          amount: number;
          reason: string;
          actor_user_id: number;
        }) => {
          draftLeadGrants.push({
            userId: values.user_id,
            amount: values.amount,
            reason: values.reason,
            actorUserId: values.actor_user_id,
          });
        },
        findByUserAndDate: async () => [],
      },
    };
    return {
      tx,
      commit() {
        request = draftRequest;
        searchGrants = draftSearchGrants;
        leadGrants = draftLeadGrants;
      },
    };
  };

  return {
    get request() {
      return request;
    },
    get searchGrants() {
      return searchGrants;
    },
    get leadGrants() {
      return leadGrants;
    },
    get transactionCalls() {
      return transactionCalls;
    },
    port: {
      rateLimitDeps: {
        actionRateLimits: {
          checkAndIncrement: async () => ({
            request_count: 0,
            window_started_at: 0,
          }),
          deleteUpdatedBefore: async () => 0,
        },
        auditLogs: {
          create: async () =>
            ({
              insertId: BigInt(1),
              numInsertedOrUpdatedRows: BigInt(1),
            }) satisfies InsertResult,
          findByUser: async () => [],
          findByEntity: async () => [],
          listRecent: async () => [],
        },
      },
      uow: {
        async run<T>(operation: (tx: ApprovalTx) => Promise<T>): Promise<T> {
          transactionCalls += 1;
          const transaction = buildTxPort();
          const result = await operation(transaction.tx);
          if (
            typeof result === "object" &&
            result !== null &&
            "ok" in result &&
            result.ok
          ) {
            transaction.commit();
          }
          return result;
        },
      },
    },
  };
}
