import { createResource, Show } from "solid-js";

import { getMe } from "~/actions/auth-session";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";

export default function ProfilePage() {
  const [user] = createResource(getMe);

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p class="mt-1 text-sm text-gray-500">
          Datos de tu sesión y permisos actuales.
        </p>
      </div>

      <Show
        when={user()}
        fallback={
          <Card class="p-6 text-sm text-muted-foreground">
            Cargando perfil...
          </Card>
        }
      >
        {(currentUser) => (
          <Card class="p-6 space-y-4">
            <div>
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Nombre
              </p>
              <p class="text-base font-medium text-foreground">
                {currentUser().fullName}
              </p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Correo
              </p>
              <p class="text-base text-foreground">{currentUser().email}</p>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs uppercase tracking-wider text-muted-foreground">
                Rol actual
              </p>
              <Badge variant={getRoleBadgeVariant(currentUser().role)}>
                {getRoleLabel(currentUser().role)}
              </Badge>
            </div>
          </Card>
        )}
      </Show>
    </div>
  );
}
