import type { LeadAssignmentRepository } from "../ports/assignment-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { WorkflowUserRepository } from "../ports/user-repository";

export type RegisterLeadDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  users: WorkflowUserRepository;
};

export type LeadRegistrationLookupDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};

export type ActiveExecutiveDeps = {
  users: WorkflowUserRepository;
};
