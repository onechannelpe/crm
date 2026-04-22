import { createSignal, Show, type ParentProps } from "solid-js";

import styles from "./styles.module.css";

export function ImportDropzone(
  props: ParentProps<{
    enabled: boolean;
    onFileDropped: (file: File) => Promise<void>;
  }>,
) {
  const [isDragActive, setIsDragActive] = createSignal(false);

  function clearDragState() {
    setIsDragActive(false);
  }

  function onDragEnter(event: DragEvent) {
    if (!props.enabled) {
      return;
    }

    event.preventDefault();
    setIsDragActive(true);
  }

  function onDragOver(event: DragEvent) {
    if (!props.enabled) {
      return;
    }

    event.preventDefault();
    if (!isDragActive()) {
      setIsDragActive(true);
    }
  }

  function onDragLeave(event: DragEvent) {
    if (!props.enabled) {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      clearDragState();
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && target.contains(relatedTarget)) {
      return;
    }

    clearDragState();
  }

  function onDrop(event: DragEvent) {
    if (!props.enabled) {
      return;
    }

    event.preventDefault();
    clearDragState();

    const file = event.dataTransfer?.files?.item(0);
    if (file) {
      void props.onFileDropped(file);
    }
  }

  return (
    <div
      class={styles.dropzoneHost}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {props.children}
      <Show when={props.enabled && isDragActive()}>
        <div class={styles.dropzoneOverlay}>
          <div class={styles.dropzoneCard}>
            <p class={styles.dropzoneTitle}>Suelta el CSV para importar</p>
            <p class={styles.dropzoneHint}>
              Se detecta automáticamente Estado o Prioridad por encabezados
            </p>
          </div>
        </div>
      </Show>
    </div>
  );
}
