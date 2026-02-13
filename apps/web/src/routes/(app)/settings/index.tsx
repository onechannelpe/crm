import { Card } from "~/components/ui/card";

export default function SettingsPage() {
    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>
                <p class="mt-1 text-sm text-gray-500">
                    Ajustes operativos y parámetros administrables del CRM.
                </p>
            </div>

            <Card class="p-6 space-y-3">
                <h2 class="text-base font-semibold text-foreground">Módulos administrables</h2>
                <ul class="space-y-2 text-sm text-muted-foreground">
                    <li>Scripts de llamada y outcomes.</li>
                    <li>Catálogo de productos, precios y planes.</li>
                    <li>Límites de intentos y alertas por etapa.</li>
                </ul>
            </Card>

            <Card class="p-6 text-sm text-muted-foreground">
                Esta vista define la base para separar configuración de cuenta personal.
            </Card>
        </div>
    );
}
