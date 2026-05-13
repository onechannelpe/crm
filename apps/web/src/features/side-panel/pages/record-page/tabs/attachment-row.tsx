import { createMemo } from "solid-js";

import type { LeadSaleProofFileView } from "~/contracts/workflow";
import CalendarDays from "~/components/icons/calendar-days";
import {
  ActivityListRow,
  ActivityRowBody,
  ActivityRowEnd,
  ActivityRowIcon,
  ActivityRowTitle,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";

import { AttachmentActionsMenu } from "./attachment-actions-menu";
import {
  getFileCategoryFromExtension,
  getFileCategoryFromMime,
  getFileExtension,
} from "./file-category";
import { FileIcon } from "./file-icon";

import styles from "./files.module.css";

type AttachmentRowProps = {
  file: LeadSaleProofFileView;
  onDownload: (artifactId: string) => Promise<void> | void;
  onPreview?: (file: LeadSaleProofFileView) => Promise<void> | void;
};

export function AttachmentRow(props: AttachmentRowProps) {
  const extension = createMemo(() => getFileExtension(props.file.filename));
  const category = createMemo(() => {
    const extCategory = getFileCategoryFromExtension(extension());
    return extCategory === "other"
      ? getFileCategoryFromMime(props.file.detectedMime)
      : extCategory;
  });

  return (
    <ActivityListRow>
      <div class={styles.attachmentRow}>
        <ActivityRowIcon>
          <FileIcon category={category()} extension={extension()} />
        </ActivityRowIcon>
        <ActivityRowBody>
          <ActivityRowTitle>
            {props.onPreview ? (
              <button
                type="button"
                class={styles.filenameButton}
                title={props.file.filename}
                onClick={() => void props.onPreview?.(props.file)}
              >
                <span class={styles.filename}>{props.file.filename}</span>
              </button>
            ) : (
              <span class={styles.filename} title={props.file.filename}>
                {props.file.filename}
              </span>
            )}
          </ActivityRowTitle>
        </ActivityRowBody>
        <ActivityRowEnd>
          <div class={styles.rowRightContent}>
            <div class={styles.rowDate}>
              <CalendarDays size={14} />
              <span>{formatDateTime(props.file.uploadedAt)}</span>
            </div>
            <AttachmentActionsMenu
              file={props.file}
              onPreview={props.onPreview}
              onDownload={props.onDownload}
            />
          </div>
        </ActivityRowEnd>
      </div>
    </ActivityListRow>
  );
}
