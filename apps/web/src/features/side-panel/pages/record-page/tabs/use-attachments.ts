import { createResource, type Accessor } from "solid-js";

import { listLeadSaleProofFilesApi } from "~/features/workflow/api/files";
import type { LeadSaleProofFileView } from "~/contracts/workflow";

export function useAttachments(leadId: Accessor<string | null>) {
  const [attachments, { refetch, mutate }] = createResource<
    LeadSaleProofFileView[],
    string | null
  >(leadId, async (id) => {
    if (!id) {
      return [];
    }
    return listLeadSaleProofFilesApi(id);
  });

  return {
    attachments,
    refetch,
    mutate,
    isLoading: () => attachments.loading,
  };
}
