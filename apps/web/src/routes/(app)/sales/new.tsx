import { createSignal, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createSale, submitSale } from "~/actions/sales";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { useToast } from "~/components/feedback/toast-provider";
import { getErrorMessage } from "~/lib/errors";

export default function NewSalePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [contactId, setContactId] = createSignal(searchParams.contactId?.toString() || "");
    const [noteId, setNoteId] = createSignal<number | null>(null);
    const [loading, setLoading] = createSignal(false);
    const { showToast } = useToast();

    async function handleCreate(e: Event) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createSale(Number(contactId()));
            setNoteId(res.id);
            showToast("success", `Nota de cargo #${res.id} creada`);
        } catch (err: unknown) {
            showToast("error", getErrorMessage(err, "Error al crear venta"));
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        const currentNoteId = noteId();
        if (!currentNoteId) return;
        setLoading(true);
        try {
            await submitSale(currentNoteId);
            showToast("success", "Nota enviada a revisión");
            navigate("/leads");
        } catch (err: unknown) {
            showToast("error", getErrorMessage(err, "Error al enviar"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold text-gray-900">Nueva venta</h1>
                <Button variant="secondary" onClick={() => navigate("/leads")}>
                    Cancelar
                </Button>
            </div>

            <Show when={!noteId()}>
                <Card>
                    <div class="p-6">
                        <form onSubmit={handleCreate} class="space-y-4 max-w-md">
                            <Input
                                type="number"
                                label="ID del Contacto"
                                value={contactId()}
                                onInput={(e) => setContactId((e.target as HTMLInputElement).value)}
                                required
                            />
                            <Button type="submit" disabled={loading()}>
                                {loading() ? "Creando..." : "Crear nota de cargo"}
                            </Button>
                        </form>
                    </div>
                </Card>
            </Show>

            <Show when={noteId()}>
                <Card>
                    <div class="p-6 space-y-4">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">
                                Nota de cargo #{noteId()}
                            </h3>
                            <p class="text-sm text-gray-500 mt-1">
                                Agrega productos y documentos, luego envía a revisión.
                            </p>
                        </div>

                        <div class="flex justify-end">
                            <Button onClick={handleSubmit} disabled={loading()}>
                                {loading() ? "Enviando..." : "Enviar a validación"}
                            </Button>
                        </div>
                    </div>
                </Card>
            </Show>
        </div>
    );
}
