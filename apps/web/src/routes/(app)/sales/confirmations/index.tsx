import { useAction } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { getErrorMessage } from "~/lib/errors";
import {
  confirmSalesRecordMutation,
  registerSalesRecordAttemptMutation,
  rejectSalesRecordMutation,
} from "~/lib/mutations/sales-records";
import { pendingSalesRecordsQuery } from "~/lib/queries/sales-records";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";
import { formatDate } from "~/lib/utils";

import styles from "./confirmations-page.module.css";

const ATTEMPT_OUTCOMES = [
  { value: "no_answer", label: "No respondió" },
  { value: "callback_scheduled", label: "Llamada programada" },
  { value: "validated", label: "Validado" },
  { value: "invalid_data", label: "Datos inválidos" },
  { value: "rejected", label: "Rechazado" },
] as const;

function isAttemptOutcome(
  value: string,
): value is (typeof ATTEMPT_OUTCOMES)[number]["value"] {
  return ATTEMPT_OUTCOMES.some((outcome) => outcome.value === value);
}

export default function SalesConfirmationsPage() {
  const { data: currentNotes, update: updateNotes } = createOptimisticQuery(
    pendingSalesRecordsQuery,
    { initialValue: [] },
  );
  const confirmRecord = useAction(confirmSalesRecordMutation);
  const rejectRecord = useAction(rejectSalesRecordMutation);
  const registerAttempt = useAction(registerSalesRecordAttemptMutation);
  const [rejectingNoteId, setRejectingNoteId] = createSignal<number | null>(
    null,
  );
  const [attemptingNoteId, setAttemptingNoteId] = createSignal<number | null>(
    null,
  );
  const [attemptOutcome, setAttemptOutcome] =
    createSignal<(typeof ATTEMPT_OUTCOMES)[number]["value"]>("no_answer");
  const [attemptNotes, setAttemptNotes] = createSignal("");
  const [nextAttemptAt, setNextAttemptAt] = createSignal("");
  const { showToast } = useToast();

  const handleApprove = async (noteId: number) => {
    try {
      await updateNotes({
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          await confirmRecord(noteId);
        },
      });
      showToast("success", `Venta #${noteId} confirmada`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo confirmar la venta"));
    }
  };

  const handleReject = async (
    noteId: number,
    rejections: Array<{ fieldId: string; note: string }>,
  ) => {
    try {
      await updateNotes({
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          const reason = rejections
            .map((it) => `${it.fieldId}: ${it.note}`)
            .join(" | ");
          await rejectRecord(noteId, reason);
        },
      });
      showToast("success", `Venta #${noteId} rechazada`);
      setRejectingNoteId(null);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo rechazar la venta"));
    }
  };

  const resetAttemptState = () => {
    setAttemptingNoteId(null);
    setAttemptOutcome("no_answer");
    setAttemptNotes("");
    setNextAttemptAt("");
  };

  const handleAttempt = async (noteId: number) => {
    try {
      const nextAttemptAtValue = nextAttemptAt().trim();
      const parsedNextAttemptAt =
        nextAttemptAtValue.length > 0 ? Date.parse(nextAttemptAtValue) : null;
      if (
        nextAttemptAtValue.length > 0 &&
        (Number.isNaN(parsedNextAttemptAt) || parsedNextAttemptAt === null)
      ) {
        showToast("error", "La fecha del próximo intento no es válida");
        return;
      }

      await registerAttempt(
        noteId,
        attemptOutcome(),
        attemptNotes().trim() || null,
        parsedNextAttemptAt,
      );
      showToast("success", `Intento registrado para la venta #${noteId}`);
      resetAttemptState();
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo registrar el intento"),
      );
    }
  };

  return (
    <AppPage>
      <Show
        when={currentNotes().length > 0}
        fallback={
          <EmptyState
            title="No hay ventas pendientes de confirmación"
            description="Las ventas enviadas aparecerán aquí."
          />
        }
      >
        <Show when={rejectingNoteId()}>
          {(id) => (
            <section class={styles.rejectPanel}>
              <h2 class={styles.rejectTitle}>Rechazar venta #{id()}</h2>
              <RejectionForm
                onReject={(rejections) => handleReject(id(), rejections)}
                onCancel={() => setRejectingNoteId(null)}
              />
            </section>
          )}
        </Show>
        <Show when={attemptingNoteId()}>
          {(id) => (
            <section class={styles.attemptPanel}>
              <h2 class={styles.attemptTitle}>
                Registrar intento para venta #{id()}
              </h2>
              <div class={styles.attemptFields}>
                <Select
                  value={attemptOutcome()}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    if (isAttemptOutcome(value)) setAttemptOutcome(value);
                  }}
                >
                  <For each={ATTEMPT_OUTCOMES}>
                    {(outcome) => (
                      <option value={outcome.value}>{outcome.label}</option>
                    )}
                  </For>
                </Select>
                <Input
                  type="datetime-local"
                  label="Próximo intento (opcional)"
                  value={nextAttemptAt()}
                  onInput={(e) => setNextAttemptAt(e.currentTarget.value)}
                />
                <Textarea
                  label="Notas (opcional)"
                  value={attemptNotes()}
                  onInput={(e) => setAttemptNotes(e.currentTarget.value)}
                  rows={3}
                />
                <div class={styles.attemptActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resetAttemptState()}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleAttempt(id());
                    }}
                  >
                    Guardar intento
                  </Button>
                </div>
              </div>
            </section>
          )}
        </Show>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead class={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={currentNotes()}>
              {(note) => (
                <TableRow>
                  <TableCell class={styles.idCell}>#{note.id}</TableCell>
                  <TableCell>
                    <div class={styles.contactWrap}>
                      <p class={styles.contactName}>{note.contactName}</p>
                      <p class={styles.contactMeta}>{note.contactDni}</p>
                    </div>
                  </TableCell>
                  <TableCell>{note.executiveName}</TableCell>
                  <TableCell class={styles.dateCell}>
                    {formatDate(note.createdAt)}
                  </TableCell>
                  <TableCell class={styles.actionsCell}>
                    <div class={styles.actions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void handleApprove(note.id);
                        }}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectingNoteId(note.id)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAttemptingNoteId(note.id);
                        }}
                      >
                        Registrar intento
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </AppPage>
  );
}
