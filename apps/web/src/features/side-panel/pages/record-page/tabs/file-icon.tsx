import type { FileCategory } from "./file-category";

import styles from "./files.module.css";

const LABEL_BY_CATEGORY: Record<FileCategory, string> = {
  archive: "ZIP",
  audio: "AUD",
  image: "IMG",
  presentation: "PPT",
  spreadsheet: "XLS",
  text_document: "DOC",
  video: "VID",
  other: "FILE",
};

type FileIconProps = {
  category: FileCategory;
  extension: string | null;
};

export function FileIcon(props: FileIconProps) {
  const extensionLabel = props.extension?.slice(0, 4).toUpperCase();
  const label =
    extensionLabel && extensionLabel.length > 0
      ? extensionLabel
      : LABEL_BY_CATEGORY[props.category];

  return (
    <div
      class={styles.fileIcon}
      data-category={props.category}
      aria-hidden="true"
    >
      <span>{label}</span>
    </div>
  );
}
