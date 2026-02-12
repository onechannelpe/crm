import { createSignal, Show } from "solid-js";
import { approveSale, rejectSale } from "~/actions/sales";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";

export default function ValidationPage() {
    const [noteId, setNoteId] = createSignal("");
    const [loading, setLoading] = createSignal(false);
    const { showToast } = useToast();

    const handleApprove = async () => {
        const id = Number(noteId());
        if (!id) return;

        setLoading(true);
        try {
            await approveSale(id);
            showToast("success", `Venta #${id} aprobada`);
            setNoteId("");
        } catch (err: any) {
            showToast("error", err.message || "Error al aprobar");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        const id = Number(noteId());
        if (!id) return;

        setLoading(true);
        try {
            await rejectSale(id, [
                { field_id: "general", reviewer_note: "Requiere corrección" },
            ]);
            showToast("success", `Venta #${id} rechazada`);
            setNoteId("");
        } catch (err: any) {
            showToast("error", err.message || "Error al rechazar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Validación de Ventas</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Cola de ventas pendientes de aprobación
                </p>
            </div>

            <Card>
                <div class="p-6">
                    <h3 class="font-semibold text-lg mb-4">Revisar Venta</h3>
                    <div class="space-y-4 max-w-md">
                        <Input
                            type="number"
                            label="ID Nota de Cargo"
                            value={noteId()}
                            onInput={(e) => setNoteId((e.target as HTMLInputElement).value)}
                            placeholder="Ingresa el ID de la venta"
                        />

                        <Show when={noteId()}>
                            <div class="flex gap-2">
                                <Button
                                    variant="success"
                                    onClick={handleApprove}
                                    disabled={loading()}
                                >
                                    {loading() ? "Procesando..." : "Aprobar"}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleReject}
                                    disabled={loading()}
                                >
                                    Rechazar
                                </Button>
                            </div>
                        </Show>
                    </div>
                </div>
            </Card>

            <EmptyState
                title="Sin ventas pendientes"
                description="Las ventas enviadas aparecerán aquí automáticamente"
            />
        </div>
    );
}
