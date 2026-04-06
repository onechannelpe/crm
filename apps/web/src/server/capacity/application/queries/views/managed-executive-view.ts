import type {
  LeadCapacityStatusView,
  SearchCapacityStatusView,
} from "./capacity-status-view";

export type ManagedExecutiveView = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchCapacityStatusView;
  leadStatus: LeadCapacityStatusView;
};
