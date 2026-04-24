import { createSignal, Show } from "solid-js";

import { requestLeadSaleProofDownloadToken } from "~/actions/workflow/files";
import type { LeadSaleProofFileView } from "~/actions/workflow/files";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";
import {
  ActivitySection,
  ActivityTabContainer,
} from "~/features/side-panel/components/activity-tabs/primitives";

import { AttachmentList } from "./attachment-list";
import { PreviewModal } from "./preview-modal";
import { useAttachments } from "./use-attachments";
import { useUploadAttachmentFile } from "./use-upload-attachment-file";

import styles from "./files.module.css";

type FilesCardProps = {
  leadId: string;
  canUpload: boolean;
};

function hasDraggedFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }
  return Array.from(types).includes("Files");
}

export function FilesCard(props: FilesCardProps) {
  const [error, setError] = createSignal<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = createSignal(false);
  const [previewState, setPreviewState] = createSignal<{
    file: LeadSaleProofFileView;
    previewUrl: string;
  } | null>(null);
  const fileInputId = `lead-sale-proof-upload-input-${props.leadId}`;

  const { attachments, refetch } = useAttachments(() => props.leadId);
  const { uploading, uploadAttachmentFile } = useUploadAttachmentFile({
    leadId: () => props.leadId,
    onUploaded: async () => {
      await refetch();
    },
  });

  async function uploadFiles(files: File[]) {
    if (!props.canUpload || files.length === 0) {
      return;
    }

    setError(null);
    try {
      await Promise.all(files.map((file) => uploadAttachmentFile(file)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir el archivo",
      );
    }
  }

  async function handleDownload(artifactId: string) {
    setError(null);
    try {
      const token = await requestLeadSaleProofDownloadToken({
        leadId: props.leadId,
        artifactId,
      });
      window.location.href = `/api/files/download/${token.token}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo descargar el archivo",
      );
    }
  }

  async function handlePreview(file: LeadSaleProofFileView) {
    setError(null);
    try {
      const token = await requestLeadSaleProofDownloadToken({
        leadId: props.leadId,
        artifactId: file.artifactId,
      });
      setPreviewState({
        file,
        previewUrl: `/api/files/download/${token.token}?inline=1`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo abrir la vista previa",
      );
    }
  }

  return (
    <ActivityTabContainer>
      <ActivitySection
        title="Comprobantes"
        count={attachments()?.length}
        action={
          <>
            <input
              id={fileInputId}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              class={styles.fileInput}
              multiple
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                void uploadFiles(files);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              class={styles.addFileButton}
              disabled={!props.canUpload || uploading()}
              loading={uploading()}
              onClick={() => {
                const input = window.document.getElementById(fileInputId);
                if (input instanceof HTMLInputElement) {
                  input.click();
                }
              }}
            >
              <Plus size={14} />
              Agregar archivo
            </Button>
          </>
        }
      >
        <div
          class={styles.dropTarget}
          onDragEnter={(event) => {
            if (props.canUpload && hasDraggedFiles(event)) {
              event.preventDefault();
              setIsDraggingFile(true);
            }
          }}
          onDragOver={(event) => {
            if (props.canUpload && hasDraggedFiles(event)) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
          }}
        >
          <AttachmentList
            attachments={attachments() ?? []}
            canUpload={props.canUpload}
            isDraggingFile={isDraggingFile()}
            setIsDraggingFile={setIsDraggingFile}
            onUploadFiles={uploadFiles}
            onDownload={handleDownload}
            onPreview={handlePreview}
          />
        </div>
        <Show when={error()}>
          {(message) => <p class={styles.error}>{message()}</p>}
        </Show>
      </ActivitySection>
      <PreviewModal
        state={previewState()}
        onClose={() => setPreviewState(null)}
        onDownload={handleDownload}
      />
    </ActivityTabContainer>
  );
}
