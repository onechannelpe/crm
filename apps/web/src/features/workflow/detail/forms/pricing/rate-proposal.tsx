import { useAction } from "@solidjs/router";
import { createSignal, createUniqueId, For, Show } from "solid-js";

import { uploadLeadRateRevisionFile } from "~/actions/workflow/files";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Paperclip from "~/components/icons/paperclip";
import Target from "~/components/icons/target";
import Trash from "~/components/icons/trash";
import { Button } from "~/components/ui/input/button";
import { FileDropzone } from "~/components/ui/input/file-dropzone";
import {
  InlineFieldEditor,
  InlineOptionsEditor,
} from "~/components/ui/input/inline-field-editor";
import type { EditRateProposalInput } from "~/contracts/workflow/inputs";
import { MAX_RATE_REVISION_FILES } from "~/contracts/workflow/limits";
import type {
  LeadDetailRateProposalView,
  LeadDetailRateRevisionView,
} from "~/contracts/workflow/views";
import { CURRENCIES } from "~/contracts/workflow/vocabulary";
import {
  FieldTable,
  FieldTextValue,
  RecordInlineCell,
} from "~/features/widgets/field-table";
import {
  WidgetCardActions,
  WidgetCard,
  WidgetCardContent,
  WidgetCardHeader,
  WidgetCardTitle,
} from "~/features/widgets/widget-card";
import {
  formatAmount,
  formatRate,
} from "~/features/workflow/presentation/format";
import { formatDate } from "~/lib/utils";
import { actionErrorMessage } from "~/lib/wire-error";

import {
  acceptRateMutation,
  editRateProposalMutation,
  requestRateRevisionMutation,
} from "../../../data/command-mutations";
import { revalidateWorkflowLead } from "../../../data/revalidate-workflow";

import styles from "../quoted.module.css";

type StagedFile = {
  fileId: string;
  filename: string;
  sizeBytes: number;
};

type RateProposalSectionProps = {
  leadId: string;
  proposal: LeadDetailRateProposalView;
  reservationExpiresAt: number | null;
  rateRevisions: LeadDetailRateRevisionView[];
  canRequestRevision: boolean;
  canAccept: boolean;
  canEdit: boolean;
};

export function RateProposalSection(props: RateProposalSectionProps) {
  const accept = useAction(acceptRateMutation);
  const requestRevision = useAction(requestRateRevisionMutation);
  const edit = useAction(editRateProposalMutation);

  const [accepting, setAccepting] = createSignal(false);
  const [showRevisionForm, setShowRevisionForm] = createSignal(false);
  const [justification, setJustification] = createSignal("");
  const [stagedFiles, setStagedFiles] = createSignal<StagedFile[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [acceptErrorMessage, setAcceptErrorMessage] = createSignal<
    string | null
  >(null);
  const [revisionErrorMessage, setRevisionErrorMessage] = createSignal<
    string | null
  >(null);
  const justificationId = createUniqueId();

  const currentRound = () => props.rateRevisions.length;
  const isRenegotiation = () => currentRound() > 0;
  const isExpired = () =>
    props.proposal.outcome === "pending" &&
    props.reservationExpiresAt !== null &&
    props.reservationExpiresAt <= Date.now();

  async function handleAccept() {
    setAcceptErrorMessage(null);
    setAccepting(true);
    try {
      await accept({ leadId: props.leadId, proposalId: props.proposal.id });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      setAcceptErrorMessage(actionErrorMessage(caught));
    } finally {
      setAccepting(false);
    }
  }

  async function submitField(patch: Partial<EditRateProposalInput>) {
    try {
      await edit({
        leadId: props.leadId,
        proposalId: props.proposal.id,
        proposedDebitRate: props.proposal.proposedDebitRate,
        proposedCreditRate: props.proposal.proposedCreditRate,
        proposedForeignRate: props.proposal.proposedForeignRate,
        fee: props.proposal.fee,
        paybackPricing: props.proposal.paybackPricing,
        currency: props.proposal.currency,
        ...patch,
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      throw new Error(actionErrorMessage(caught), { cause: caught });
    }
  }

  const numberFieldEdit = (
    label: string,
    current: number,
    toPatch: (value: number) => Partial<EditRateProposalInput>,
  ) =>
    props.canEdit
      ? {
          ariaLabel: `Editar ${label}`,
          renderEditor: (onClose: () => void) => (
            <InlineFieldEditor
              initialValue={String(current)}
              ariaLabel={label}
              type="number"
              step="0.01"
              min="0"
              onSubmit={(value) => submitField(toPatch(Number(value)))}
              onClose={onClose}
            />
          ),
        }
      : undefined;

  const currencyFieldEdit = () =>
    props.canEdit
      ? {
          ariaLabel: "Editar Moneda",
          renderEditor: (onClose: () => void) => (
            <InlineOptionsEditor
              options={CURRENCIES}
              selected={props.proposal.currency}
              ariaLabel="Moneda"
              onSubmit={(value) => submitField({ currency: value })}
              onClose={onClose}
            />
          ),
        }
      : undefined;

  async function handleUploadFiles(files: File[]) {
    if (files.length === 0 || uploading()) return;
    setRevisionErrorMessage(null);

    if (stagedFiles().length + files.length > MAX_RATE_REVISION_FILES) {
      setRevisionErrorMessage(
        `Solo se pueden adjuntar hasta ${MAX_RATE_REVISION_FILES} archivos por solicitud`,
      );
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.set("leadId", props.leadId);
          formData.set("file", file);
          return uploadLeadRateRevisionFile(formData);
        }),
      );

      const successes: StagedFile[] = [];
      const failures: string[] = [];

      results.forEach((result) => {
        if (result.ok) {
          successes.push({
            fileId: result.value.fileId,
            filename: result.value.filename,
            sizeBytes: result.value.sizeBytes,
          });
        } else {
          failures.push(actionErrorMessage(result.error));
        }
      });

      if (failures.length > 0) {
        setRevisionErrorMessage(
          failures.length === 1
            ? failures[0]
            : "Algunos archivos no se pudieron subir",
        );
      }

      if (successes.length > 0) {
        setStagedFiles((prev) => [...prev, ...successes]);
      }
    } catch (caught) {
      setRevisionErrorMessage(actionErrorMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  function removeStagedFile(fileId: string) {
    setStagedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  }

  async function handleSubmitRevision(e: SubmitEvent) {
    e.preventDefault();
    if (submitting()) return;
    if (!justification().trim()) {
      setRevisionErrorMessage("El fundamento es requerido");
      return;
    }
    if (stagedFiles().length === 0) {
      setRevisionErrorMessage("Se requiere al menos un documento de soporte");
      return;
    }
    setRevisionErrorMessage(null);
    setSubmitting(true);
    try {
      await requestRevision({
        leadId: props.leadId,
        justification: justification().trim(),
        fileIds: stagedFiles().map((f) => f.fileId),
      });
      await revalidateWorkflowLead(props.leadId);
    } catch (caught) {
      setRevisionErrorMessage(actionErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WidgetCard variant="side-column">
      <WidgetCardHeader>
        <WidgetCardTitle text="Tarifa propuesta" />
        <Show when={isRenegotiation()}>
          <span class={styles.roundBadge}>Ronda {currentRound() + 1}</span>
        </Show>
      </WidgetCardHeader>
      <WidgetCardContent>
        <FieldTable>
          <RecordInlineCell
            label="Payback"
            icon={Moneybag}
            edit={numberFieldEdit(
              "Payback",
              props.proposal.paybackPricing,
              (value) => ({ paybackPricing: value }),
            )}
          >
            <FieldTextValue>
              {formatAmount(props.proposal.paybackPricing)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell
            label="T. débito"
            icon={Target}
            edit={numberFieldEdit(
              "T. débito",
              props.proposal.proposedDebitRate,
              (value) => ({ proposedDebitRate: value }),
            )}
          >
            <FieldTextValue>
              {formatRate(props.proposal.proposedDebitRate)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell
            label="T. crédito"
            icon={Target}
            edit={numberFieldEdit(
              "T. crédito",
              props.proposal.proposedCreditRate,
              (value) => ({ proposedCreditRate: value }),
            )}
          >
            <FieldTextValue>
              {formatRate(props.proposal.proposedCreditRate)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell
            label="T. foráneo"
            icon={Target}
            edit={numberFieldEdit(
              "T. foráneo",
              props.proposal.proposedForeignRate,
              (value) => ({ proposedForeignRate: value }),
            )}
          >
            <FieldTextValue>
              {formatRate(props.proposal.proposedForeignRate)}
            </FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell
            label="Fee"
            icon={Moneybag}
            edit={numberFieldEdit("Fee", props.proposal.fee, (value) => ({
              fee: value,
            }))}
          >
            <FieldTextValue>{formatAmount(props.proposal.fee)}</FieldTextValue>
          </RecordInlineCell>
          <RecordInlineCell
            label="Moneda"
            icon={Package}
            edit={currencyFieldEdit()}
          >
            <FieldTextValue>{props.proposal.currency}</FieldTextValue>
          </RecordInlineCell>
          <Show when={props.reservationExpiresAt}>
            {(expiresAt) => (
              <RecordInlineCell label="Vigencia" icon={Package}>
                <FieldTextValue>
                  {isExpired()
                    ? `Vencio el ${formatDate(expiresAt())}`
                    : `Hasta el ${formatDate(expiresAt())}`}
                </FieldTextValue>
              </RecordInlineCell>
            )}
          </Show>
        </FieldTable>

        <Show
          when={
            !showRevisionForm() && (props.canAccept || props.canRequestRevision)
          }
        >
          <WidgetCardActions stack>
            <Show when={props.canAccept}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={accepting()}
                onClick={() => void handleAccept()}
              >
                Aceptar tarifa
              </Button>
            </Show>
            <Show when={props.canRequestRevision}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAcceptErrorMessage(null);
                  setShowRevisionForm(true);
                }}
              >
                Solicitar revision de tarifa
              </Button>
            </Show>
          </WidgetCardActions>
        </Show>

        <Show when={showRevisionForm()}>
          <div class={styles.negotiationForm}>
            <p class={styles.negotiationFormTitle}>
              Solicitud de revision de tarifa
            </p>
            <form onSubmit={(e) => void handleSubmitRevision(e)}>
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
                <FileDropzone
                  accept=".xlsx,.xls,.png,.jpg,.jpeg"
                  multiple
                  disabled={uploading()}
                  onFiles={(files) => void handleUploadFiles(files)}
                >
                  {(dragging) => (
                    <div
                      class={`${styles.dropZone} ${dragging ? styles.dropZoneDragging : ""}`}
                    >
                      <Paperclip size={14} />
                      {uploading()
                        ? "Subiendo..."
                        : "Adjuntar archivos o arrastrar aqui"}
                    </div>
                  )}
                </FileDropzone>

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
                            onClick={() => removeStagedFile(file.fileId)}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {revisionErrorMessage() && (
                <p class={styles.error}>{revisionErrorMessage()}</p>
              )}

              <div class={styles.formActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setStagedFiles([]);
                    setJustification("");
                    setRevisionErrorMessage(null);
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

        <Show when={acceptErrorMessage()}>
          {(message) => <p class={styles.error}>{message()}</p>}
        </Show>
      </WidgetCardContent>
    </WidgetCard>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
