import type {
  PartyRepository,
  WorkflowUserRepository,
} from "../ports/entities";
import type {
  LeadAssignmentRepository,
  LeadHistoryRepository,
  LeadRepository,
} from "../ports/lead";

export type RegisterLeadDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  users: WorkflowUserRepository;
  party: PartyRepository;
};

export type LeadRegistrationLookupDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};

export type ActiveExecutiveDeps = {
  users: WorkflowUserRepository;
};
