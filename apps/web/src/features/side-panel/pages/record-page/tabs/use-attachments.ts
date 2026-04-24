import { createResource, type Accessor } from "solid-js";

import {
  listLeadSaleProofFiles,
  type LeadSaleProofFileView,
} from "~/actions/workflow/files";

export function useAttachments(leadId: Accessor<string | null>) {
  const [attachments, { refetch, mutate }] = createResource<
    LeadSaleProofFileView[],
    string | null
  >(leadId, async (id) => {
    if (!id) {
      return [];
    }
    return listLeadSaleProofFiles(id);
  });

  return {
    attachments,
    refetch,
    mutate,
    isLoading: () => attachments.loading,
  };
}
