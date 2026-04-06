import type {
  LeadCapacityStatusView,
  SearchCapacityStatusView,
} from "./capacity-status-view";
import type { PendingCapacityRequestStatus } from "./pending-capacity-request-view";

export type ExecutiveCapacityRequestView = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill";
  status: PendingCapacityRequestStatus;
  requestedAmount: number;
  reason: string;
  decisionNote: string | null;
  reviewerUserId: number | null;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
};

export type ExecutiveCapacityDetailView = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchCapacityStatusView;
  leadStatus: LeadCapacityStatusView;
  requests: ExecutiveCapacityRequestView[];
};
