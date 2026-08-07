import { createAsync, revalidate } from "@solidjs/router";
import type { Accessor } from "solid-js";

import { leadSaleProofFilesQuery } from "~/rpc/workflow/lead-sale-proof-files";

export function useAttachments(leadId: Accessor<string | null>) {
  const attachments = createAsync(async () => {
    const id = leadId();
    if (!id) {
      return [];
    }

    return leadSaleProofFilesQuery(id);
  });

  return {
    attachments,
    refetch: async () => {
      const id = leadId();
      if (!id) {
        return;
      }

      await revalidate(leadSaleProofFilesQuery.keyFor(id));
    },
  };
}
