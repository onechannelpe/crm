import type { LeadAssignmentRepository } from "../ports/assignment-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { PipelineUserRepository } from "../ports/user-repository";

export type RegisterLeadDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  users: PipelineUserRepository;
};

export type ReassignLeadDeps = RegisterLeadDeps;

export type LeadRegistrationLookupDeps = {
  leads: LeadRepository;
  users: PipelineUserRepository;
};

export type ActiveExecutiveDeps = {
  users: PipelineUserRepository;
};
