import { createResource, For, Show } from "solid-js";
import { getTeamMembers } from "~/actions/team";
import Mail from "~/components/icons/mail";
import User from "~/components/icons/user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/feedback/empty-state";
import { getRoleBadgeVariant, getRoleLabel } from "~/lib/auth/role-display";

export default function TeamPage() {
  const [members] = createResource(getTeamMembers);

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Equipo</h1>
          <p class="text-sm text-gray-500 mt-1">
            {members()?.length ?? 0} miembros en tu sucursal
          </p>
        </div>
      </div>

      <Show
        when={(members()?.length ?? 0) > 0}
        fallback={
          <EmptyState
            title="Sin miembros"
            description="No se encontraron miembros en tu sucursal."
          />
        }
      >
        <div class="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={members()}>
                {(member) => (
                  <TableRow>
                    <TableCell class="font-medium">
                      <div class="flex items-center gap-3">
                        <div class="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User class="h-4 w-4" />
                        </div>
                        <span>{member.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div class="flex items-center gap-2 text-muted-foreground">
                        <Mail class="h-3 w-3" />
                        <span>{member.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "success" : "default"}>
                        {member.isActive ? "Activo" : "Inactivo"}
                      </Badge>
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
