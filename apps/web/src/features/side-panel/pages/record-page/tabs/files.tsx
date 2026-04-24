import { createResource, createSignal, For, Show } from "solid-js";

import {
  listLeadSaleProofFiles,
  requestLeadSaleProofDownloadToken,
  uploadLeadSaleProofFile,
} from "~/actions/workflow/files";
import { Button } from "~/components/ui/input/button";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import {
  ActivityListCard,
  ActivityListRow,
  ActivityRowBody,
  ActivityRowDescription,
  ActivityRowEnd,
  ActivityRowMeta,
  ActivityRowTitle,
  ActivitySection,
  ActivityTabContainer,
} from "~/features/side-panel/components/activity-tabs/primitives";
import { formatDateTime } from "~/lib/utils";

import type { TabContentProps } from "./content-props";

import styles from "./files.module.css";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab(props: TabContentProps) {
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const fileInputId = "lead-sale-proof-upload-input";

  const leadId = () => (props.mode === "view" ? props.data.lead.id : null);
  const canUpload = () =>
    props.mode === "view" && props.data.lead.stage === "CONVERTED";

  const [files, { refetch }] = createResource(leadId, async (id) => {
    if (!id) {
      return [];
    }
    return listLeadSaleProofFiles(id);
  });

  async function handleUpload(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const id = leadId();
    if (!canUpload()) {
      event.currentTarget.value = "";
      return;
    }

    const file = event.currentTarget.files?.item(0);
    if (!file || !id) {
      event.currentTarget.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadLeadSaleProofFile(id, formData);
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir el archivo",
      );
    } finally {
      setUploading(false);
      event.currentTarget.value = "";
    }
  }

  async function handleDownload(artifactId: string) {
    const id = leadId();
    if (!id) return;

    setError(null);
    try {
      const token = await requestLeadSaleProofDownloadToken({
        leadId: id,
        artifactId,
      });
      window.location.href = `/api/files/download/${token.token}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo descargar el archivo",
      );
    }
  }

  if (props.mode === "create") {
    return (
      <ActivityTabContainer>
        <ActivityTabEmptyState
          type="noFile"
          title="Sin archivos"
          subtitle="Los comprobantes se habilitan cuando la venta está convertida."
        />
      </ActivityTabContainer>
    );
  }

  return (
    <ActivityTabContainer>
      <ActivitySection
        title="Comprobantes"
        count={files()?.length}
        action={
          <>
            <input
              id={fileInputId}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              class={styles.fileInput}
              onChange={(event) => void handleUpload(event)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canUpload() || uploading()}
              loading={uploading()}
              onClick={() => {
                const input = window.document.getElementById(fileInputId);
                if (input instanceof HTMLInputElement) {
                  input.click();
                }
              }}
            >
              Subir archivo
            </Button>
          </>
        }
      >
        <Show
          when={files()?.length}
          fallback={
            <ActivityTabEmptyState
              type="noFile"
              title="Sin archivos"
              subtitle={
                canUpload()
                  ? "Sube pruebas de venta en PDF o imagen."
                  : "La carga de comprobantes se habilita en etapa Convertido."
              }
            />
          }
        >
          <ActivityListCard>
            <For each={files()}>
              {(file) => (
                <ActivityListRow>
                  <ActivityRowBody>
                    <ActivityRowTitle>{file.filename}</ActivityRowTitle>
                    <ActivityRowDescription>
                      {file.detectedMime} · {formatBytes(file.sizeBytes)}
                    </ActivityRowDescription>
                    <ActivityRowMeta>
                      {formatDateTime(file.uploadedAt)}
                    </ActivityRowMeta>
                  </ActivityRowBody>
                  <ActivityRowEnd>
                    <span class={styles.status} data-status={file.status}>
                      {file.status === "ready"
                        ? "Listo"
                        : file.status === "failed"
                          ? "Error"
                          : "Procesando"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={file.status !== "ready"}
                      onClick={() => void handleDownload(file.artifactId)}
                    >
                      Descargar
                    </Button>
                  </ActivityRowEnd>
                </ActivityListRow>
              )}
            </For>
          </ActivityListCard>
        </Show>

        <Show when={error()}>
          {(message) => <p class={styles.error}>{message()}</p>}
        </Show>
      </ActivitySection>
    </ActivityTabContainer>
  );
}
