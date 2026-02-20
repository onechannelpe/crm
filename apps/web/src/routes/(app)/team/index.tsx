import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import {
  getTeamDirectory,
  resendTeamInvite,
  revokeTeamInvite,
} from "~/actions/team";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Mail from "~/components/icons/mail";
import User from "~/components/icons/user";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { getErrorMessage } from "~/lib/errors";
import { createAppQuery } from "~/lib/ui/create-app-query";

export default function TeamPage() {
  const [directory, { refetch }] = createAppQuery(getTeamDirectory, {
    members: [],
    pendingInvites: [],
    canManageInvites: false,
  });
  const [pendingActionId, setPendingActionId] = createSignal<number | null>(
    null,
  );
  const { showToast } = useToast();
  const canManageInviteActions = () => directory().canManageInvites;

  async function handleResend(inviteId: number): Promise<void> {
    setPendingActionId(inviteId);
    try {
      await resendTeamInvite(inviteId);
      showToast("success", "Invitacion reenviada");
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo reenviar"));
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleRevoke(inviteId: number): Promise<void> {
    setPendingActionId(inviteId);
    try {
      await revokeTeamInvite(inviteId);
      showToast("success", "Invitacion revocada");
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo revocar"));
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Gestión interna"
        title="Equipo"
        description={`${directory().members.length} miembros activos y ${directory().pendingInvites.length} invitaciones pendientes.`}
        actions={
          <Show when={directory().canManageInvites}>
            <A href="/team/new">
              <Button>Invitar usuario</Button>
            </A>
          </Show>
        }
      />

      <Show
        when={directory().members.length > 0}
        fallback={
          <EmptyState
            title="Sin miembros"
            description="No se encontraron miembros activos en tu sucursal."
          />
        }
      >
        <AppPageSection class="p-2 md:p-3">
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
              <For each={directory().members}>
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
        </AppPageSection>
      </Show>

      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-foreground">
          Invitaciones pendientes
        </h2>
        <Show
          when={directory().pendingInvites.length > 0}
          fallback={
            <EmptyState
              title="Sin invitaciones"
              description="No hay invitaciones pendientes por activar."
            />
          }
        >
          <AppPageSection class="p-2 md:p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={directory().pendingInvites}>
                  {(invite) => (
                    <TableRow>
                      <TableCell class="font-medium">
                        {invite.fullName}
                      </TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invite.role)}>
                          {getRoleLabel(invite.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expiresAt).toLocaleString("es-PE")}
                      </TableCell>
                      <TableCell>
                        <Show
                          when={canManageInviteActions()}
                          fallback={
                            <span class="text-xs text-muted-foreground">
                              Sin permisos
                            </span>
                          }
                        >
                          <div class="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pendingActionId() === invite.inviteId}
                              onClick={() => {
                                void handleResend(invite.inviteId);
                              }}
                            >
                              Reenviar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={pendingActionId() === invite.inviteId}
                              onClick={() => {
                                void handleRevoke(invite.inviteId);
                              }}
                            >
                              Revocar
                            </Button>
                          </div>
                        </Show>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </AppPageSection>
        </Show>
      </div>
    </AppPage>
  );
}
