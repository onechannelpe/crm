import styles from "./files.module.css";

type DropZoneProps = {
  onUploadFiles: (files: File[]) => Promise<void> | void;
};

export function DropZone(props: DropZoneProps) {
  return (
    <div
      class={styles.dropZone}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length > 0) {
          void props.onUploadFiles(files);
        }
      }}
    >
      <p class={styles.dropZoneTitle}>Subir archivos</p>
      <p class={styles.dropZoneSubtitle}>Arrastra y suelta comprobantes aquí</p>
    </div>
  );
}
