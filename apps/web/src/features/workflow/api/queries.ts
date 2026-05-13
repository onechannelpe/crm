import {
  queryAssignableExecutives,
  queryLeadBootstrapPreview,
  queryLeadDetail,
  queryLeadList,
} from "~/actions/workflow/queries/records";

export async function queryLeadListApi(
  filters: Parameters<typeof queryLeadList>[0],
) {
  return queryLeadList(filters);
}

export async function queryLeadDetailApi(leadId: string) {
  return queryLeadDetail(leadId);
}

export async function queryLeadBootstrapPreviewApi(ruc: string) {
  return queryLeadBootstrapPreview(ruc);
}

export async function queryAssignableExecutivesApi(
  input: Parameters<typeof queryAssignableExecutives>[0],
) {
  return queryAssignableExecutives(input);
}
