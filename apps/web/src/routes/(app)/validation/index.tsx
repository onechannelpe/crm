import { createResource, createSignal, For, Show } from "solid-js";
import {
  approveSale,
  rejectSale,
  getPendingReviewNotes,
} from "~/actions/sales";
import { Button } from "~/components/ui/button";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import { getErrorMessage } from "~/lib/errors";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ValidationPage() {
  const [notes, { refetch }] = createResource(getPendingReviewNotes);
  const [rejectingNoteId, setRejectingNoteId] = createSignal<number | null>(
    null,
  );
  const { showToast } = useToast();

  const handleApprove = async (noteId: number) => {
    try {
      await approveSale(noteId);
      showToast("success", `Venta #${noteId} aprobada`);
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al aprobar"));
    }
  };

  const handleReject = async (
    noteId: number,
    rejections: Array<{ fieldId: string; note: string }>,
  ) => {
    try {
      await rejectSale(
        noteId,
        rejections.map((it) => ({
          field_id: it.fieldId,
          reviewer_note: it.note,
        })),
      );
      showToast("success", `Venta #${noteId} rechazada`);
      setRejectingNoteId(null);
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Error al rechazar"));
    }
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Validación de ventas</h1>
        <p class="text-sm text-gray-500 mt-1">
          {notes()?.length ?? 0} ventas pendientes de aprobación
        </p>
      </div>

      <Show
        when={(notes()?.length ?? 0) > 0}
        fallback={
          <EmptyState
            title="Sin ventas pendientes"
            description="Las ventas enviadas aparecerán aquí automáticamente"
          />
        }
      >
        <Show when={rejectingNoteId()}>
          {(id) => (
            <div class="rounded-md border border-red-200 bg-red-50 p-4">
              <h2 class="font-semibold text-red-900 mb-2">
                Rechazar venta #{id()}
              </h2>
              <RejectionForm
                onReject={(rejections) => handleReject(id(), rejections)}
                onCancel={() => setRejectingNoteId(null)}
              />
            </div>
          )}
        </Show>
        <div class="rounded-md border bg-white">
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
              <For each={notes()}>
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
                      <div class="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          class="bg-emerald-600 hover:bg-emerald-700 text-white"
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
