import { createSignal, For, Show } from "solid-js";

import {
  requestLeadSaleProofDownloadToken,
  requestRateRevisionFileDownloadToken,
} from "~/actions/workflow/files";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";
import type { LeadSaleProofFileView } from "~/contracts/workflow/results";
import { type LeadDetailRateRevisionView } from "~/contracts/workflow/views";
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
  rateRevisions?: LeadDetailRateRevisionView[];
};

function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function FilesCard(props: FilesCardProps) {
  const [fileActionErrorMessage, setFileActionErrorMessage] = createSignal<
    string | null
  >(null);
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

  const rateRevisions = () => props.rateRevisions ?? [];
  const revisionFileCount = () =>
    rateRevisions().reduce(
      (count, revision) => count + revision.files.length,
      0,
    );

  async function uploadFiles(files: File[]) {
    if (!props.canUpload || files.length === 0) {
      return;
    }

    setFileActionErrorMessage(null);

    try {
      await Promise.all(files.map((file) => uploadAttachmentFile(file)));
      await refetch();
    } catch (caught) {
      setFileActionErrorMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo subir el archivo",
      );
    }
  }

  async function handleDownload(artifactId: string) {
    setFileActionErrorMessage(null);

    try {
      const token = await requestLeadSaleProofDownloadToken({
        leadId: props.leadId,
        artifactId,
      });

      window.location.href = `/api/files/download/${token.token}`;
    } catch (caught) {
      setFileActionErrorMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo descargar el archivo",
      );
    }
  }

  async function handlePreview(file: LeadSaleProofFileView) {
    setFileActionErrorMessage(null);

    try {
      const token = await requestLeadSaleProofDownloadToken({
        leadId: props.leadId,
        artifactId: file.artifactId,
      });

      setPreviewState({
        file,
        previewUrl: `/api/files/download/${token.token}?inline=1`,
      });
    } catch (caught) {
      setFileActionErrorMessage(
        caught instanceof Error
          ? caught.message
          : "No se pudo abrir la vista previa",
      );
    }
  }

  async function handleRevisionDownload(leadId: string, artifactId: string) {
    setFileActionErrorMessage(null);

    const result = await requestRateRevisionFileDownloadToken({
      leadId,
      artifactId,
    });

    if (result.ok) {
      window.location.href = `/api/files/download/${result.value.token}`;
    } else {
      setFileActionErrorMessage(actionErrorMessage(result.error));
    }
  }

  return (
    <ActivityTabContainer>
      <Show when={revisionFileCount() > 0}>
        <ActivitySection
          title="Revisiones de tarifa"
          count={revisionFileCount()}
        >
          <ActivityListCard>
            <For each={rateRevisions()}>
              {(revision) => (
                <For each={revision.files}>
                  {(file) => (
                    <ActivityListRow
                      onClick={() =>
                        void handleRevisionDownload(
                          props.leadId,
                          file.artifactId,
                        )
                      }
                    >
                      <ActivityRowBody>
                        <ActivityRowTitle>{file.filename}</ActivityRowTitle>
                        <ActivityRowMeta>
                          Ronda {revision.round}
                        </ActivityRowMeta>
                      </ActivityRowBody>
                    </ActivityListRow>
                  )}
                </For>
              )}
            </For>
          </ActivityListCard>
        </ActivitySection>
      </Show>

      <ActivitySection
        title="Comprobantes"
        count={attachments()?.length ?? 0}
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
          onDragLeave={(event) => {
            if (props.canUpload && hasDraggedFiles(event)) {
              dragEnterCount = Math.max(0, dragEnterCount - 1);

              if (dragEnterCount === 0) {
                setIsDraggingFile(false);
              }
            }
          }}
          onDrop={(event) => {
            event.preventDefault();

            dragEnterCount = 0;
            setIsDraggingFile(false);

            const files = Array.from(event.dataTransfer?.files ?? []);
            void uploadFiles(files);
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

        <Show when={fileActionErrorMessage()}>
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
