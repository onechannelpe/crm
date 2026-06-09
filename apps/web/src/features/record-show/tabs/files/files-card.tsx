import { createSignal, For, Show } from "solid-js";

import {
  requestLeadSaleProofDownloadToken,
  requestNegotiationFileDownloadToken,
} from "~/actions/workflow/files";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";
import type { LeadSaleProofFileView } from "~/contracts/workflow/results";
import { type LeadDetailNegotiationRequestView } from "~/contracts/workflow/views";
import {
  ActivitySection,
  ActivityListCard,
  ActivityListRow,
  ActivityRowBody,
  ActivityRowTitle,
  ActivityRowMeta,
  ActivityTabContainer,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { actionErrorMessage } from "~/lib/wire-error";

import { AttachmentList } from "./attachment-list";
import { PreviewModal } from "./preview-modal";
import { useAttachments } from "./use-attachments";
import { useUploadAttachmentFile } from "./use-upload-attachment-file";

import styles from "./files.module.css";

type FilesCardProps = {
  leadId: string;
  canUpload: boolean;
  negotiationRequests?: LeadDetailNegotiationRequestView[];
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
  const [fileInputRef, setFileInputRef] = createSignal<HTMLInputElement>();

  let dragEnterCount = 0;

  const { attachments, refetch } = useAttachments(() => props.leadId);
  const { uploading, uploadAttachmentFile } = useUploadAttachmentFile({
    leadId: () => props.leadId,
  });

  async function uploadFiles(files: File[]) {
    if (!props.canUpload || files.length === 0) {
      return;
    }

    setError(null);
    try {
      await Promise.all(files.map((file) => uploadAttachmentFile(file)));
      await refetch();
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

  const negotiationRequests = () => props.negotiationRequests ?? [];
  const allNegotiationFiles = () =>
    negotiationRequests().flatMap((req) =>
      req.files.map((f) => ({ ...f, round: req.round, requestId: req.id })),
    );

  async function handleNegotiationDownload(leadId: string, artifactId: string) {
    setError(null);
    const result = await requestNegotiationFileDownloadToken({
      leadId,
      artifactId,
    });

    if (result.ok) {
      window.location.href = `/api/files/download/${result.value.token}`;
    } else {
      setError(actionErrorMessage(result.error));
    }
  }

  return (
    <ActivityTabContainer>
      <Show when={allNegotiationFiles().length > 0}>
        <ActivitySection
          title="Revisiones de tasa"
          count={allNegotiationFiles().length}
        >
          <ActivityListCard>
            <For each={negotiationRequests()}>
              {(req) => (
                <For each={req.files}>
                  {(file) => (
                    <ActivityListRow
                      onClick={() =>
                        void handleNegotiationDownload(
                          props.leadId,
                          file.artifactId,
                        )
                      }
                    >
                      <ActivityRowBody>
                        <ActivityRowTitle>{file.filename}</ActivityRowTitle>
                        <ActivityRowMeta>Ronda {req.round}</ActivityRowMeta>
                      </ActivityRowBody>
                    </ActivityListRow>
                  )}
                </For>
              )}
            </For>
          </ActivityListCard>
          <Show when={error()}>
            {(message) => <p class={styles.error}>{message()}</p>}
          </Show>
        </ActivitySection>
      </Show>

      <ActivitySection
        title="Comprobantes"
        count={attachments()?.length}
        action={
          <>
            <input
              ref={setFileInputRef}
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
              onClick={() => fileInputRef()?.click()}
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
              dragEnterCount++;
              setIsDraggingFile(true);
            }
          }}
          onDragOver={(event) => {
            if (props.canUpload && hasDraggedFiles(event)) {
              event.preventDefault();
            }
          }}
          onDragLeave={(_event) => {
            dragEnterCount--;
            if (dragEnterCount === 0) {
              setIsDraggingFile(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragEnterCount = 0;
            setIsDraggingFile(false);
          }}
        >
          <AttachmentList
            attachments={attachments() ?? []}
            canUpload={props.canUpload}
            isDraggingFile={isDraggingFile()}
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
