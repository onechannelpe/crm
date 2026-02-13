import { createResource, Show } from "solid-js";
import { getMe } from "~/actions/auth";
import { getQuotaStatus } from "~/actions/quota";
import { getDashboardStats } from "~/actions/dashboard";
import { Card } from "~/components/ui/card";
import { QuotaDisplay } from "~/components/features/quota/quota-display";

export default function DashboardPage() {
    const [user] = createResource(getMe);
    const [quota] = createResource(getQuotaStatus);
    const [stats] = createResource(getDashboardStats);
    const quotaValues = () => {
        const current = quota();
        if (!current?.allocated) return null;
        return { used: current.used, total: current.total };
    };

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">
                    Hola, {user()?.fullName || "Usuario"} 👋
                </h1>
                <p class="text-gray-500 mt-1">Aquí tienes un resumen de hoy.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Leads Activos</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">
                            {stats()?.activeLeads ?? "—"}
                        </p>
                    </div>
                </Card>

                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Ventas Pendientes</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">
                            {stats()?.pendingSales ?? "—"}
                        </p>
                    </div>
                </Card>

                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Borradores</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">
                            {stats()?.draftSales ?? "—"}
                        </p>
                    </div>
                </Card>

                <Card>
                    <div class="p-6">
                        <p class="text-sm text-gray-500">Ventas Aprobadas</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2">
                            {stats()?.approvedSales ?? "—"}
                        </p>
                    </div>
                </Card>
            </div>

            <Show when={quotaValues()}>
                {(values) => (
                    <QuotaDisplay used={values().used} total={values().total} />
                )}
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
    );
}
