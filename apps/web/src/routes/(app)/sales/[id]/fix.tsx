import { useParams, useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { submitSale } from "~/actions/sales";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useToast } from "~/components/feedback/toast-provider";

export default function FixSalePage() {
    const params = useParams();
    const navigate = useNavigate();
    const noteId = () => Number(params.id);
    const [loading, setLoading] = createSignal(false);
    const { showToast } = useToast();

    async function handleResubmit() {
        setLoading(true);
        try {
            await submitSale(noteId());
            showToast("success", "Nota reenviada a revisión");
            navigate("/leads");
        } catch (err: any) {
            showToast("error", err.message || "Error al reenviar");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold text-gray-900">Corregir Venta</h1>
                <Button variant="secondary" onClick={() => navigate("/leads")}>
                    Volver
                </Button>
            </div>

            <Card>
                <div class="p-6">
                    <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-4">
                        <h2 class="font-bold text-red-900 mb-2">
                            Correcciones Requeridas — Nota #{noteId()}
                        </h2>
                        <p class="text-sm text-gray-700">
                            Los campos rechazados aparecerán aquí con las notas del revisor.
                        </p>
                    </div>

                    <div class="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => navigate("/leads")}>
                            Cancelar
                        </Button>
                        <Button onClick={handleResubmit} disabled={loading()}>
                            {loading() ? "Enviando..." : "Reenviar para Validación"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
