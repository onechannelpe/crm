import {
  queryAssignableExecutives,
  queryLeadBootstrapPreview,
  queryLeadDetail,
  queryLeadList,
} from "~/actions/workflow/queries/records";
import type {
  AssignableExecutivesInput,
  LeadListFiltersInput,
} from "~/contracts/workflow";

export async function queryLeadListApi(filters: LeadListFiltersInput) {
  return queryLeadList(filters);
}

export async function queryLeadDetailApi(leadId: string) {
  return queryLeadDetail(leadId);
}

export async function queryLeadBootstrapPreviewApi(ruc: string) {
  return queryLeadBootstrapPreview(ruc);
}

export async function queryAssignableExecutivesApi(
  input: AssignableExecutivesInput,
) {
  return queryAssignableExecutives(input);
}
