import {
  queryAssignableExecutives,
  queryLeadBootstrapPreview,
  queryLeadDetail,
  queryLeadList,
} from "~/actions/workflow/queries/records";

export async function queryWorkflowLeadList(filters: Parameters<typeof queryLeadList>[0]) {
  return queryLeadList(filters);
}

export async function queryWorkflowLeadDetail(leadId: string) {
  return queryLeadDetail(leadId);
}

export async function queryWorkflowLeadBootstrapPreview(ruc: string) {
  return queryLeadBootstrapPreview(ruc);
}

export async function queryWorkflowAssignableExecutives(input: Parameters<typeof queryAssignableExecutives>[0]) {
  return queryAssignableExecutives(input);
}
