import { createResource, Show } from "solid-js";
import { getMe } from "~/actions/auth";
import { getQuotaStatus } from "~/actions/quota";
import { Card } from "~/components/ui/card";
import { QuotaDisplay } from "~/components/features/quota/quota-display";

export default function DashboardPage() {
    const [user] = createResource(getMe);
    const [quota] = createResource(getQuotaStatus);

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">
                    Hola, {user()?.fullName || "Usuario"} 👋
                </h1>
                <p class="text-gray-500 mt-1">Aquí tienes un resumen de hoy.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Leads Activos</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                </Card>

                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Ventas Pendientes</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                </Card>

                <Show when={quota()?.allocated}>
                    <QuotaDisplay
                        used={(quota() as any).used ?? 0}
                        total={(quota() as any).total ?? 10}
                    />
                </Show>
                <Show when={!quota()?.allocated}>
                    <Card>
                        <div class="p-6">
                            <p class="text-sm text-gray-500">Cuota Restante</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">—</p>
                            <p class="text-xs text-gray-400 mt-1">Sin cuota asignada</p>
                        </div>
                    </Card>
                </Show>
            </div>
        </div>
    );
}
