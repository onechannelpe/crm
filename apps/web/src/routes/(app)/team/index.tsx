import { createResource, For, Show } from "solid-js";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/feedback/empty-state";
import { getMe } from "~/actions/auth";

export default function TeamPage() {
    // TODO: wire up getTeamUsers action
    const [user] = createResource(getMe);

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Mi Equipo</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Vista del equipo
                </p>
            </div>

            <Show when={user()}>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4">
                            <h3 class="font-semibold text-gray-900">{user()!.fullName}</h3>
                            <Badge variant="info">{user()!.role}</Badge>
                            <p class="text-xs text-gray-400 mt-1">{user()!.email}</p>
                        </div>
                    </Card>
                </div>
            </Show>

            <Show when={!user()}>
                <EmptyState
                    title="No hay usuarios"
                    description="Los usuarios del equipo aparecerán aquí"
                />
            </Show>
        </div>
    );
}
