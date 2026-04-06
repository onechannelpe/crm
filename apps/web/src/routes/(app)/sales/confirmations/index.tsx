import { useAction } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";

import type { SalesRecordQueueItemView } from "~/actions/sales-records/read";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
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

type SalesConfirmationRow = SalesRecordQueueItemView;

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
            .map((item) => `${item.fieldId}: ${item.note}`)
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

  const columns = createMemo(
    () =>
      [
        {
          key: "id",
          label: "ID",
          icon: CircleQuestionMark,
          width: 90,
          sticky: true,
          renderCell: (note) => `#${note.id}`,
        },
        {
          key: "contactName",
          label: "Contacto",
          icon: UserRound,
          minWidth: 220,
          grow: true,
          renderCell: (note) => (
            <div class={styles.contactWrap}>
              <p class={styles.contactName}>{note.contactName}</p>
              <p class={styles.contactMeta}>{note.contactDni}</p>
            </div>
          ),
        },
        {
          key: "executiveName",
          label: "Responsable",
          icon: UserRound,
          width: 180,
          renderCell: (note) => note.executiveName,
        },
        {
          key: "createdAt",
          label: "Fecha",
          icon: CalendarDays,
          width: 160,
          renderCell: (note) => formatDate(note.createdAt),
        },
        {
          key: "actions",
          label: "Acciones",
          icon: CircleQuestionMark,
          width: 320,
          renderCell: (note) => (
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
          ),
        },
      ] satisfies ReadonlyArray<DataGridColumn<SalesConfirmationRow>>,
  );

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
        <DataGrid
          ariaLabel="Confirmaciones de ventas"
          columns={[...columns()]}
          emptyState={<></>}
          rowOpen={createNoopRowOpen()}
          source={{
            status: "ready",
            rows: currentNotes(),
          }}
        />
      </Show>
    </AppPage>
  );
}
