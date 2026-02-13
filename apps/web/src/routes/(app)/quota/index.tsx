import { createResource, createSignal, Show } from "solid-js";
import { getQuotaStatus, allocateQuota } from "~/actions/quota";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { QuotaDisplay } from "~/components/features/quota/quota-display";
import { useToast } from "~/components/feedback/toast-provider";
import { getErrorMessage } from "~/lib/errors";

export default function QuotaPage() {
    const [quota, { refetch }] = createResource(getQuotaStatus);
    const [execId, setExecId] = createSignal("");
    const [amount, setAmount] = createSignal("10");
    const [loading, setLoading] = createSignal(false);
    const { showToast } = useToast();
    const quotaValues = () => {
        const current = quota();
        if (!current?.allocated) return null;
        return { used: current.used, total: current.total };
    };

    async function handleAllocate(e: Event) {
        e.preventDefault();
        setLoading(true);
        try {
            await allocateQuota(Number(execId()), Number(amount()));
            showToast("success", "Cuota asignada correctamente");
            refetch();
            setExecId("");
            setAmount("10");
        } catch (err: unknown) {
            showToast("error", getErrorMessage(err, "Error al asignar cuota"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="space-y-6 max-w-2xl">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Gestión de Cuotas</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Asigna cuotas diarias a tus ejecutivos
                </p>
            </div>

            <Show when={quotaValues()}>
                {(values) => (
                    <QuotaDisplay used={values().used} total={values().total} />
                )}
            </Show>
            <Show when={!quota()?.allocated}>
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <p class="text-sm text-gray-500">Sin cuota asignada por el momento.</p>
                </div>
            </Show>

            <div class="bg-white border border-gray-200 rounded-lg p-6">
                <h3 class="font-semibold mb-4">Asignar Cuota</h3>
                <form onSubmit={handleAllocate} class="space-y-4">
                    <Input
                        type="number"
                        label="ID del Ejecutivo"
                        value={execId()}
                        onInput={(e) => setExecId((e.target as HTMLInputElement).value)}
                        required
                    />

                    <Input
                        type="number"
                        label="Cantidad de leads"
                        value={amount()}
                        onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
                        min="1"
                        max="100"
                        required
                    />

                    <Button
                        type="submit"
                        disabled={loading()}
                        class="w-full"
                    >
                        {loading() ? "Asignando..." : "Asignar Cuota"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
