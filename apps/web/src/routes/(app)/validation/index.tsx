import { createResource, createSignal, For, Show } from "solid-js";

import {
  approveSale,
  rejectSale,
  getPendingReviewNotes,
} from "~/actions/sales";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
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
    <AppPage class="space-y-7">
      <AppPageHeader
        eyebrow="Mesa de revisión"
        title="Validación de ventas"
        description={`${currentNotes().length} ventas pendientes. Revisa evidencia, aprueba lo correcto y rechaza con observaciones claras.`}
      />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AppPageSection class="p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Pendientes
          </p>
          <p class="mt-1 text-3xl font-semibold">{currentNotes().length}</p>
          <p class="text-xs text-muted-foreground">Esperando decisión</p>
        </AppPageSection>
        <AppPageSection class="p-5">
          <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Estado de revisión
          </p>
          <p class="mt-1 text-2xl font-semibold">
            {rejectingNoteId() ? "Rechazo activo" : "Revisión rápida"}
          </p>
          <p class="text-xs text-muted-foreground">
            {rejectingNoteId()
              ? "Completa observaciones antes de continuar"
              : "Aprueba o abre un rechazo detallado"}
          </p>
        </AppPageSection>
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
            <AppPageSection class="border border-destructive/30 bg-destructive/10 p-5 shadow-none backdrop-blur-0">
              <h2 class="mb-2 text-lg font-semibold text-destructive">
                Rechazar venta #{id()}
              </h2>
              <RejectionForm
                onReject={(rejections) => handleReject(id(), rejections)}
                onCancel={() => setRejectingNoteId(null)}
              />
            </AppPageSection>
          )}
        </Show>
        <AppPageSection class="p-2 md:p-3">
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
        </AppPageSection>
      </Show>
    </AppPage>
  );
}
