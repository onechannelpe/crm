import { useAction } from "@solidjs/router";
import { createSignal, createUniqueId, For, Show } from "solid-js";

import { uploadLeadNegotiationFile } from "~/actions/workflow/files";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Paperclip from "~/components/icons/paperclip";
import Target from "~/components/icons/target";
import Trash from "~/components/icons/trash";
import { Button } from "~/components/ui/input/button";
import { MAX_NEGOTIATION_FILES } from "~/contracts/workflow/limits";
import type {
  LeadDetailNegotiationRequestView,
  LeadDetailQuotationView,
} from "~/contracts/workflow/views";
import {
  formatAmount,
  formatRate,
} from "~/features/record-show/sections/workflow/format";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/side-panel/components/field-table";
import {
  RecordDetailSectionActions,
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";
import { actionErrorMessage } from "~/lib/error-messages";

import {
  approveForSaleMutation,
  requestRateNegotiationMutation,
} from "../../data/command-mutations";
import { revalidateWorkflowLead } from "../../data/revalidate-workflow";

import styles from "./quoted.module.css";

type StagedFile = {
  artifactId: string;
  filename: string;
  sizeBytes: number;
};

type QuotedSectionProps = {
  leadId: string;
  quotation: LeadDetailQuotationView;
  negotiationRequests: LeadDetailNegotiationRequestView[];
  canRequestNegotiation: boolean;
  canApprove: boolean;
};

export function QuotedSection(props: QuotedSectionProps) {
  const approve = useAction(approveForSaleMutation);
  const requestNegotiation = useAction(requestRateNegotiationMutation);

  const [approving, setApproving] = createSignal(false);
  const [showNegotiationForm, setShowNegotiationForm] = createSignal(false);
  const [justification, setJustification] = createSignal("");
  const [stagedFiles, setStagedFiles] = createSignal<StagedFile[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const justificationId = createUniqueId();
  const fileInputId = createUniqueId();

  const currentRound = () => props.negotiationRequests.length;
  const isRenegotiation = () => currentRound() > 0;

  async function handleApprove() {
    setError(null);
    setApproving(true);
    try {
      await approve({ leadId: props.leadId });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(actionErrorMessage(err, "Error al aprobar"));
    } finally {
      setApproving(false);
    }
  }

  async function handleUploadFiles(files: File[]) {
    if (files.length === 0 || uploading()) return;
    setError(null);

    if (stagedFiles().length + files.length > MAX_NEGOTIATION_FILES) {
      setError(
        `Solo se pueden adjuntar hasta ${MAX_NEGOTIATION_FILES} archivos por solicitud`,
      );
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.set("file", file);
          return uploadLeadNegotiationFile(props.leadId, formData);
        }),
      );

      const successes: StagedFile[] = [];
      const failures: string[] = [];

      results.forEach((result) => {
        if (result.ok) {
          successes.push({
            artifactId: result.value.artifactId,
            filename: result.value.filename,
            sizeBytes: result.value.sizeBytes,
          });
        } else {
          failures.push(
            actionErrorMessage(result.error, "Error al subir archivo"),
          );
        }
      });

      if (failures.length > 0) {
        setError(
          failures.length === 1
            ? failures[0]
            : "Algunos archivos no se pudieron subir",
        );
      }

      if (successes.length > 0) {
        setStagedFiles((prev) => [...prev, ...successes]);
      }
    } catch (err) {
      setError(actionErrorMessage(err, "Error al subir archivo"));
    } finally {
      setUploading(false);
    }
  }

  function removeStagedFile(artifactId: string) {
    setStagedFiles((prev) => prev.filter((f) => f.artifactId !== artifactId));
  }

  async function handleSubmitNegotiation(e: SubmitEvent) {
    e.preventDefault();
    if (submitting()) return;
    if (!justification().trim()) {
      setError("El fundamento es requerido");
      return;
    }
    if (stagedFiles().length === 0) {
      setError("Se requiere al menos un documento de soporte");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await requestNegotiation({
        leadId: props.leadId,
        justification: justification().trim(),
        artifactIds: stagedFiles().map((f) => f.artifactId),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (err) {
      setError(actionErrorMessage(err, "Error al enviar solicitud"));
    } finally {
      setSubmitting(false);
    }
  }

  let dragCount = 0;

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Propuesta recibida" />
        <Show when={isRenegotiation()}>
          <span class={styles.roundBadge}>Ronda {currentRound() + 1}</span>
        </Show>
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <FieldTable>
          <RecordInlineCell label="Payback" icon={Moneybag}>
            <FieldTextValue>
              {formatAmount(props.quotation.paybackPricing)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="T. debito" icon={Target}>
            <FieldTextValue>
              {formatRate(props.quotation.tarifaDebito)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="T. credito" icon={Target}>
            <FieldTextValue>
              {formatRate(props.quotation.tarifaCredito)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="T. foraneo" icon={Target}>
            <FieldTextValue>
              {formatRate(props.quotation.tarifaForaneo)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="Fee" icon={Moneybag}>
            <FieldTextValue>{formatAmount(props.quotation.fee)}</FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell label="Moneda" icon={Package}>
            <FieldTextValue>{props.quotation.moneda}</FieldTextValue>
          </RecordInlineCell>
        </FieldTable>

        <Show when={!showNegotiationForm()}>
          <RecordDetailSectionActions stack>
            <Show when={props.canApprove}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={approving()}
                onClick={() => void handleApprove()}
              >
                Aprobar para venta
              </Button>
            </Show>
            <Show when={props.canRequestNegotiation}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowNegotiationForm(true)}
              >
                Solicitar revision de tasa
              </Button>
            </Show>
          </RecordDetailSectionActions>
        </Show>

        <Show when={showNegotiationForm()}>
          <div class={styles.negotiationForm}>
            <p class={styles.negotiationFormTitle}>
              Solicitud de revision de tasa
            </p>
            <form onSubmit={(e) => void handleSubmitNegotiation(e)}>
              <label class={styles.justificationLabel}>
                Fundamento
                <textarea
                  id={justificationId}
                  class={styles.justificationTextarea}
                  value={justification()}
                  onInput={(e) => setJustification(e.currentTarget.value)}
                  placeholder="Describe el motivo de la solicitud..."
                  required
                />
              </label>

              <div class={styles.fileSection}>
                <span class={styles.fileSectionLabel}>
                  Documentos de soporte
                </span>
                <label
                  for={fileInputId}
                  class={`${styles.dropZone} ${isDragging() ? styles.dropZoneDragging : ""}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    dragCount++;
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => {
                    dragCount--;
                    if (dragCount === 0) setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dragCount = 0;
                    setIsDragging(false);
                    const files = Array.from(e.dataTransfer?.files ?? []);
                    void handleUploadFiles(files);
                  }}
                >
                  <input
                    type="file"
                    class={styles.fileInput}
                    id={fileInputId}
                    accept=".xlsx,.xls,.png,.jpg,.jpeg"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files ?? []);
                      void handleUploadFiles(files);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Paperclip size={14} />
                  {uploading()
                    ? "Subiendo..."
                    : "Adjuntar archivos o arrastrar aqui"}
                </label>

                <Show when={stagedFiles().length > 0}>
                  <div class={styles.stagedFiles}>
                    <For each={stagedFiles()}>
                      {(file) => (
                        <div class={styles.stagedFile}>
                          <span class={styles.stagedFileName}>
                            {file.filename}
                          </span>
                          <span class={styles.stagedFileSize}>
                            {formatBytes(file.sizeBytes)}
                          </span>
                          <button
                            type="button"
                            class={styles.removeFileButton}
                            onClick={() => removeStagedFile(file.artifactId)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {error() && <p class={styles.error}>{error()}</p>}

              <div class={styles.formActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowNegotiationForm(false);
                    setStagedFiles([]);
                    setJustification("");
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting()}
                  disabled={uploading()}
                >
                  Enviar solicitud
                </Button>
              </div>
            </form>
          </div>
        </Show>

        <Show when={error() && !showNegotiationForm()}>
          {(message) => <p class={styles.error}>{message()}</p>}
        </Show>
      </RecordDetailSectionBody>
    </RecordDetailSection>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
