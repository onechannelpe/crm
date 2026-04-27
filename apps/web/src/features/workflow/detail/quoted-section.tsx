import { useAction } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import { uploadLeadNegotiationFile } from "~/actions/workflow/negotiation-files";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Paperclip from "~/components/icons/paperclip";
import Target from "~/components/icons/target";
import Trash from "~/components/icons/trash";
import { Button } from "~/components/ui/input/button";
import {
  FieldIcon,
  FieldLabel,
  FieldLabelText,
  FieldRow,
  FieldTable,
} from "~/features/side-panel/components/field-table";
import {
  RelationList,
  RelationMeta,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import { toAppError } from "~/lib/app-errors";
import type {
  LeadDetailNegotiationRequestView,
  LeadDetailQuotationView,
} from "~/server/workflow/application/queries/views/lead-detail";

import {
  approveForSaleMutation,
  requestRateNegotiationMutation,
} from "../data/mutations";
import { formatAmount, formatRate } from "~/features/side-panel/pages/record-page/widgets/workflow/format";

import styles from "./quoted-section.module.css";

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

  const currentRound = () => props.negotiationRequests.length;
  const isRenegotiation = () => currentRound() > 0;

  async function handleApprove() {
    setError(null);
    setApproving(true);
    try {
      await approve({ leadId: props.leadId });
    } catch (err) {
      setError(toAppError(err, "Error al aprobar").publicMessage);
    } finally {
      setApproving(false);
    }
  }

  async function handleUploadFiles(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadLeadNegotiationFile(props.leadId, formData);
        setStagedFiles((prev) => [
          ...prev,
          {
            artifactId: result.artifactId,
            filename: result.filename,
            sizeBytes: result.sizeBytes,
          },
        ]);
      }
    } catch (err) {
      setError(toAppError(err, "Error al subir archivo").publicMessage);
    } finally {
      setUploading(false);
    }
  }

  function removeStagedFile(artifactId: string) {
    setStagedFiles((prev) => prev.filter((f) => f.artifactId !== artifactId));
  }

  async function handleSubmitNegotiation(e: SubmitEvent) {
    e.preventDefault();
    if (!justification().trim()) {
      setError("El fundamento es requerido");
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
    } catch (err) {
      setError(toAppError(err, "Error al enviar solicitud").publicMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  let dragCount = 0;

  return (
    <section class={styles.section}>
      <p class={styles.eyebrow}>
        Propuesta recibida
        <Show when={isRenegotiation()}>
          {" "}
          <span class={styles.roundBadge}>Ronda {currentRound() + 1}</span>
        </Show>
      </p>

      <FieldTable>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Moneybag size={16} />
            </FieldIcon>
            <FieldLabelText>Payback</FieldLabelText>
          </FieldLabel>
          <RelationMeta>
            {formatAmount(props.quotation.paybackPricing)}
          </RelationMeta>
        </FieldRow>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Target size={16} />
            </FieldIcon>
            <FieldLabelText>T. debito</FieldLabelText>
          </FieldLabel>
          <RelationMeta>
            {formatRate(props.quotation.tarifaDebito)}
          </RelationMeta>
        </FieldRow>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Target size={16} />
            </FieldIcon>
            <FieldLabelText>T. credito</FieldLabelText>
          </FieldLabel>
          <RelationMeta>
            {formatRate(props.quotation.tarifaCredito)}
          </RelationMeta>
        </FieldRow>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Target size={16} />
            </FieldIcon>
            <FieldLabelText>T. foraneo</FieldLabelText>
          </FieldLabel>
          <RelationMeta>
            {formatRate(props.quotation.tarifaForaneo)}
          </RelationMeta>
        </FieldRow>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Moneybag size={16} />
            </FieldIcon>
            <FieldLabelText>Fee</FieldLabelText>
          </FieldLabel>
          <RelationMeta>{formatAmount(props.quotation.fee)}</RelationMeta>
        </FieldRow>
        <FieldRow>
          <FieldLabel>
            <FieldIcon>
              <Package size={16} />
            </FieldIcon>
            <FieldLabelText>Moneda</FieldLabelText>
          </FieldLabel>
          <RelationMeta>{props.quotation.moneda}</RelationMeta>
        </FieldRow>
      </FieldTable>

      <Show when={!showNegotiationForm()}>
        <div class={styles.actions}>
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
        </div>
      </Show>

      <Show when={showNegotiationForm()}>
        <div class={styles.negotiationForm}>
          <p class={styles.negotiationFormTitle}>
            Solicitud de revision de tasa
          </p>
          <form onSubmit={(e) => void handleSubmitNegotiation(e)}>
            <label class={styles.justificationLabel}>Fundamento</label>
            <textarea
              class={styles.justificationTextarea}
              value={justification()}
              onInput={(e) => setJustification(e.currentTarget.value)}
              placeholder="Describe el motivo de la solicitud..."
              required
            />

            <div class={styles.fileSection}>
              <span class={styles.fileSectionLabel}>
                Documentos de soporte (opcional)
              </span>
              <input
                type="file"
                class={styles.fileInput}
                id={`neg-file-input-${props.leadId}`}
                accept=".xlsx,.xls,.png,.jpg,.jpeg"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files ?? []);
                  void handleUploadFiles(files);
                  e.currentTarget.value = "";
                }}
              />
              <label
                for={`neg-file-input-${props.leadId}`}
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
    </section>
  );
}

type PreviousNegotiationsProps = {
  requests: LeadDetailNegotiationRequestView[];
};

export function PreviousNegotiationsWidget(props: PreviousNegotiationsProps) {
  return (
    <RelationList>
      <For each={props.requests}>
        {(req) => (
          <RelationRow>
            <span>Ronda {req.round}</span>
            <RelationMeta>
              {req.files.length > 0
                ? `${req.files.length} archivo${req.files.length > 1 ? "s" : ""}`
                : "Sin archivos"}
            </RelationMeta>
          </RelationRow>
        )}
      </For>
    </RelationList>
  );
}
