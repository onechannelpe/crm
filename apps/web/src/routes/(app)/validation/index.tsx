import { createResource, createSignal, For, Show } from "solid-js";

import {
  approveSale,
  rejectSale,
  getPendingReviewNotes,
} from "~/actions/sales";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ValidationPage() {
  const [notes, { mutate, refetch }] = createResource(
    () => true,
    async () => getPendingReviewNotes(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentNotes = () => notes.latest ?? [];
  const [rejectingNoteId, setRejectingNoteId] = createSignal<number | null>(
    null,
  );
  const { showToast } = useToast();

  const handleApprove = async (noteId: number) => {
    try {
      await runOptimistic({
        read: currentNotes,
        write: (next) => mutate(() => next),
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          await approveSale(noteId);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", `Venta #${noteId} aprobada`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al aprobar"));
    }
  };

  const handleReject = async (
    noteId: number,
    rejections: Array<{ fieldId: string; note: string }>,
  ) => {
    try {
      await runOptimistic({
        read: currentNotes,
        write: (next) => mutate(() => next),
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          await rejectSale(
            noteId,
            rejections.map((it) => ({
              field_id: it.fieldId,
              reviewer_note: it.note,
            })),
          );
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", `Venta #${noteId} rechazada`);
      setRejectingNoteId(null);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al rechazar"));
    }
  };

  return (
    <div class="space-y-7">
      <div class="crm-surface rounded-3xl p-6 md:p-7">
        <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Mesa de revisión
        </p>
        <h1 class="mt-1 text-3xl font-semibold text-foreground md:text-4xl">
          Validación de ventas
        </h1>
        <p class="mt-2 text-sm text-muted-foreground md:text-base">
          {currentNotes().length} ventas pendientes. Revisa evidencia, aprueba
          lo correcto y rechaza con observaciones claras.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="crm-surface rounded-3xl p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Pendientes
          </p>
          <p class="mt-1 text-3xl font-semibold">{currentNotes().length}</p>
          <p class="text-xs text-muted-foreground">Esperando decisión</p>
        </div>
        <div class="crm-surface rounded-3xl p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            SLA recomendado
          </p>
          <p class="mt-1 text-3xl font-semibold">24h</p>
          <p class="text-xs text-muted-foreground">
            Tiempo máximo de respuesta
          </p>
        </div>
        <div class="crm-surface rounded-3xl p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Modo actual
          </p>
          <p class="mt-1 text-2xl font-semibold">
            {rejectingNoteId() ? "Rechazo activo" : "Revisión rápida"}
          </p>
          <p class="text-xs text-muted-foreground">
            {rejectingNoteId()
              ? "Completa observaciones antes de continuar"
              : "Aprueba o abre un rechazo detallado"}
          </p>
        </div>
      </div>

      <Show
        when={currentNotes().length > 0}
        fallback={
          <EmptyState
            title="Sin ventas pendientes"
            description="Las ventas enviadas aparecerán aquí automáticamente"
          />
        }
      >
        <Show when={rejectingNoteId()}>
          {(id) => (
            <div class="rounded-3xl border border-red-200 bg-red-50 p-5">
              <h2 class="mb-2 text-lg font-semibold text-red-900">
                Rechazar venta #{id()}
              </h2>
              <RejectionForm
                onReject={(rejections) => handleReject(id(), rejections)}
                onCancel={() => setRejectingNoteId(null)}
              />
            </div>
          )}
        </Show>
        <div class="crm-surface rounded-3xl p-2 md:p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Ejecutivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={currentNotes()}>
                {(note) => (
                  <TableRow>
                    <TableCell class="font-medium">#{note.id}</TableCell>
                    <TableCell>
                      <div>
                        <p class="font-medium">{note.contactName}</p>
                        <p class="text-xs text-muted-foreground">
                          {note.contactDni}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{note.executiveName}</TableCell>
                    <TableCell class="text-muted-foreground">
                      {formatDate(note.created_at)}
                    </TableCell>
                    <TableCell class="text-right">
                      <div class="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            void handleApprove(note.id);
                          }}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectingNoteId(note.id)}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>
      </Show>
    </div>
  );
}
