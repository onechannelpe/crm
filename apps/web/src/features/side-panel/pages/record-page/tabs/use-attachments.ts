import { createResource, type Accessor } from "solid-js";

import { listLeadSaleProofFiles } from "~/actions/workflow/files";
import type { LeadSaleProofFileView } from "~/contracts/workflow/results";

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
