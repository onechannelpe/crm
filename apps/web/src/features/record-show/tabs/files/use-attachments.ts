import { createAsync, revalidate } from "@solidjs/router";
import type { Accessor } from "solid-js";

import { leadSaleProofFilesQuery } from "~/features/workflow/data/queries";

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
      if (!id) return;

      await revalidate(leadSaleProofFilesQuery.keyFor(id));
    },
  };
}
