import { createSignal, type Accessor } from "solid-js";

import { uploadLeadSaleProofFile } from "~/rpc/workflow/files";

type UseUploadAttachmentFileParams = {
  leadId: Accessor<string | null>;
  onUploaded?: () => Promise<void> | void;
};

export function useUploadAttachmentFile(params: UseUploadAttachmentFileParams) {
  const [pendingUploads, setPendingUploads] = createSignal(0);

  async function uploadAttachmentFile(file: File) {
    const id = params.leadId();
    if (!id) {
      throw new Error("leadId is required");
    }

    const formData = new FormData();
    formData.set("leadId", id);
    formData.set("file", file);

    setPendingUploads((current) => current + 1);
    try {
      await uploadLeadSaleProofFile(formData);
      await params.onUploaded?.();
    } finally {
      setPendingUploads((current) => Math.max(0, current - 1));
    }
  }

  return {
    uploading: () => pendingUploads() > 0,
    uploadAttachmentFile,
  };
}
