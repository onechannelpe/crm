import {
  repos,
  rateLimitDeps,
  salesRecordsService,
} from "~/server/shared/context";

export { rateLimitDeps, salesRecordsService };

export const salesRecordRepos = {
  products: repos.products,
  leadAssignments: repos.leadAssignments,
  contacts: repos.contacts,
  organizations: repos.organizations,
  salesRecords: repos.salesRecords,
};
