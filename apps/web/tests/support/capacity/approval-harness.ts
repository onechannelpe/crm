import type { Role } from "~/lib/auth/access/rbac";
import type {
  CapacityApprovalPort,
  CapacityApprovalTxPort,
} from "~/server/capacity/application/ports";
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
  let request = input.request ? { ...input.request } : undefined;
  let searchGrants: GrantRow[] = [];
  let leadGrants: GrantRow[] = [];
  let transactionCalls = 0;

  const buildTxPort = () => {
    const draftRequest = request ? { ...request } : undefined;
    const draftSearchGrants = [...searchGrants];
    const draftLeadGrants = [...leadGrants];

    return {
      tx: {
        findRequestById: async (id: number) =>
          draftRequest?.id === id ? draftRequest : undefined,
        markRequestApproved: async (
          id: number,
          actorUserId: number,
          note: string | null,
        ) => {
          if (input.failMarkApproved) {
            throw new Error("db connection lost");
          }
          if (!draftRequest || draftRequest.id !== id) {
            return false;
          }
          draftRequest.status = "approved";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return true;
        },
        markRequestRejected: async (
          id: number,
          actorUserId: number,
          note: string,
        ) => {
          if (!draftRequest || draftRequest.id !== id) {
            return false;
          }
          draftRequest.status = "rejected";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return true;
        },
        findManagedUserById: async (userId: number) =>
          userId === input.request?.userId ? input.targetUser : undefined,
        findManagedTeamById: async (_teamId: number) => undefined,
        findBranchSupervisors: async (_branchId: number) => [],
        grantSearchCapacity: async (values: GrantRow) => {
          draftSearchGrants.push(values);
        },
        grantLeadCapacity: async (values: GrantRow) => {
          draftLeadGrants.push(values);
        },
      } satisfies CapacityApprovalTxPort,
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
      enforceApprovalRateLimit: async () => undefined,
      async withTransaction<T>(
        operation: (tx: CapacityApprovalTxPort) => Promise<T>,
      ): Promise<T> {
        transactionCalls += 1;
        const transaction = buildTxPort();
        const result = await operation(transaction.tx);
        transaction.commit();
        return result;
      },
    } satisfies CapacityApprovalPort,
  };
}
