import { For, Show } from "solid-js";

import type { LeadSaleProofFileView } from "~/contracts/workflow/results";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityListCard } from "~/features/side-panel/components/activity-tabs/primitives";

import { AttachmentRow } from "./attachment-row";
import { DropZone } from "./drop-zone";

import styles from "./files.module.css";

type AttachmentListProps = {
  attachments: LeadSaleProofFileView[];
  canUpload: boolean;
  isDraggingFile: boolean;
  onUploadFiles: (files: File[]) => Promise<void> | void;
  onDownload: (fileId: string) => Promise<void> | void;
  onPreview?: (file: LeadSaleProofFileView) => Promise<void> | void;
};

export function AttachmentList(props: AttachmentListProps) {
  const hasFiles = () => props.attachments.length > 0;

  return (
    <div class={styles.attachmentListContainer}>
      <Show
        when={props.isDraggingFile && props.canUpload}
        fallback={
          <Show
            when={hasFiles()}
            fallback={
              <ActivityTabEmptyState
                type="noFile"
                title="Sin archivos"
                subtitle={
                  props.canUpload
                    ? "Sube pruebas de venta en PDF o imagen."
                    : "La carga de comprobantes se habilita en etapa Convertido."
                }
              />
            }
          >
            <ActivityListCard>
              <For each={props.attachments}>
                {(file) => (
                  <AttachmentRow
                    file={file}
                    onDownload={props.onDownload}
                    onPreview={props.onPreview}
                  />
                )}
              </For>
            </ActivityListCard>
          </Show>
        }
      >
        <DropZone onUploadFiles={props.onUploadFiles} />
      </Show>
    </div>
  );
}
