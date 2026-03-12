import {
  createAsync,
  revalidate as revalidateQuery,
  useAction,
  useSubmissions,
} from "@solidjs/router";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { createTeamInvite } from "~/actions/team";
import type { InviteManagement } from "~/actions/team/types";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Mail from "~/components/icons/mail";
import X from "~/components/icons/x";
import { AppPageSection, AppPageSectionTitle } from "~/components/layout/page";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { useAsyncAction } from "~/hooks/use-async-action";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { getErrorMessage } from "~/lib/errors";
import {
  resendTeamInviteMutation,
  revokeTeamInviteMutation,
} from "~/lib/mutations/team";
import { inviteManagementQuery } from "~/lib/queries/team";

import styles from "../team-page.module.css";

export function TeamInviteManagementSection() {
  const inviteManagement = createAsync(() => inviteManagementQuery());
  const resendInvite = useAction(resendTeamInviteMutation);
  const revokeInvite = useAction(revokeTeamInviteMutation);
  const resendSubmissions = useSubmissions(resendTeamInviteMutation);
  const revokeSubmissions = useSubmissions(revokeTeamInviteMutation);
  const [names, setNames] = createSignal("");
  const [firstSurname, setFirstSurname] = createSignal("");
  const [secondSurname, setSecondSurname] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("");
  const [teamId, setTeamId] = createSignal("");
  const [expiresAt, setExpiresAt] = createSignal("");
  const [pendingRevokeId, setPendingRevokeId] = createSignal<number | null>(
    null,
  );
  const [doRevoke, isRevoking] = useAsyncAction(async () => {
    const id = pendingRevokeId();
    if (id !== null) {
      await handleRevoke(id);
      setPendingRevokeId(null);
    }
  });
  const { showToast } = useToast();

  createEffect(
    on(inviteManagement, (im) => {
      if (!im) return;
      const currentRole = role();
      const roleStillAssignable = im.assignableRoles.some(
        (option) => option.value === currentRole,
      );
      if (!roleStillAssignable) {
        setRole(getDefaultAssignableRole(im));
      }
    }),
  );

  const isResendPending = (inviteId: number) =>
    resendSubmissions.some((s) => s.pending && s.input[0] === inviteId);
  const isRevokePending = (inviteId: number) =>
    revokeSubmissions.some((s) => s.pending && s.input[0] === inviteId);

  async function handleResend(inviteId: number): Promise<void> {
    try {
      await resendInvite(inviteId);
      showToast("success", "Invitación reenviada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo reenviar la invitación"),
      );
    }
  }

  async function handleRevoke(inviteId: number): Promise<void> {
    try {
      await revokeInvite(inviteId);
      showToast("success", "Invitación revocada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo revocar la invitación"),
      );
    }
  }

  const [handleCreateInvite, isSavingInvite] = useAsyncAction(
    async (event: Event) => {
      event.preventDefault();
      const im = inviteManagement();
      if (!im) return;
      try {
        await createTeamInvite({
          names: names(),
          firstSurname: firstSurname(),
          secondSurname: secondSurname(),
          email: email(),
          role: role(),
          teamId: teamId() ? Number(teamId()) : null,
          expiresAt: expiresAt() ? new Date(expiresAt()).getTime() : null,
        });
        setNames("");
        setFirstSurname("");
        setSecondSurname("");
        setEmail("");
        setRole(getDefaultAssignableRole(im));
        setTeamId("");
        setExpiresAt("");
        await revalidateQuery(inviteManagementQuery.key);
        showToast("success", "Invitación enviada");
      } catch (err: unknown) {
        showToast(
          "error",
          getErrorMessage(err, "No se pudo crear la invitación"),
        );
      }
    },
  );

  return (
    <Show when={inviteManagement()} keyed>
      {(im) => (
        <>
          <ConfirmDialog
            isOpen={pendingRevokeId() !== null}
            title="Revocar invitación"
            description="La persona no podrá usar este enlace para unirse al equipo."
            confirmLabel="Revocar"
            loading={isRevoking()}
            onConfirm={() => void doRevoke()}
            onClose={() => setPendingRevokeId(null)}
          />
          <AppPageSection>
            <AppPageSectionTitle
              title="Invitar por correo"
              description="Envía una invitación por correo a nuevos miembros del equipo."
            />
            <form
              class={styles.inviteForm}
              onSubmit={(event) => {
                void handleCreateInvite(event);
              }}
            >
              <Input
                label="Nombres"
                value={names()}
                onInput={(event) => setNames(event.currentTarget.value)}
                required
              />
              <Input
                label="Primer apellido"
                value={firstSurname()}
                onInput={(event) => setFirstSurname(event.currentTarget.value)}
                required
              />
              <Input
                label="Segundo apellido"
                value={secondSurname()}
                onInput={(event) => setSecondSurname(event.currentTarget.value)}
                required
              />
              <Input
                type="email"
                label="Correo corporativo"
                value={email()}
                onInput={(event) => setEmail(event.currentTarget.value)}
                required
              />
              <Select
                label="Rol"
                value={role()}
                onInput={(event) => setRole(event.currentTarget.value)}
              >
                <For each={im.assignableRoles}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </Select>
              <Select
                label="Equipo (opcional)"
                value={teamId()}
                onInput={(event) => setTeamId(event.currentTarget.value)}
              >
                <option value="">Sin equipo</option>
                <For each={im.teams}>
                  {(team) => <option value={team.id}>{team.name}</option>}
                </For>
              </Select>
              <Input
                type="date"
                label="Fecha de vencimiento (opcional)"
                value={expiresAt()}
                onInput={(event) => setExpiresAt(event.currentTarget.value)}
              />
              <div class={styles.inviteActions}>
                <Button type="submit" disabled={isSavingInvite() || !role()}>
                  {isSavingInvite() ? "Enviando..." : "Enviar invitación"}
                </Button>
              </div>
            </form>
          </AppPageSection>

          <AppPageSection>
            <AppPageSectionTitle
              title="Invitaciones pendientes"
              description="Gestiona invitaciones activas y su fecha de expiración."
            />
            <Show
              when={im.pendingInvites.length > 0}
              fallback={
                <EmptyState
                  title="No hay invitaciones pendientes"
                  description="Todas las invitaciones ya fueron resueltas."
                />
              }
            >
              <Table class={styles.tableCompact}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correo</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={im.pendingInvites}>
                    {(invite) => (
                      <TableRow>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell>
                          {getExpiresAtText(invite.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(invite.role)}>
                            {getRoleLabel(invite.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div class={styles.actions}>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Reenviar invitación"
                              disabled={isResendPending(invite.inviteId)}
                              title="Reenviar invitación"
                              onClick={() => {
                                void handleResend(invite.inviteId);
                              }}
                            >
                              <Mail size={14} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Revocar invitación"
                              disabled={isRevokePending(invite.inviteId)}
                              title="Revocar invitación"
                              onClick={() => {
                                setPendingRevokeId(invite.inviteId);
                              }}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </Show>
          </AppPageSection>
        </>
      )}
    </Show>
  );
}

function getExpiresAtText(expiresAt: number): string {
  const now = Date.now();
  if (expiresAt <= now) {
    return "Expirada";
  }

  const minutes = Math.floor((expiresAt - now) / (1000 * 60));
  if (minutes < 60) {
    return `En ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `En ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `En ${days} d`;
}

function getDefaultAssignableRole(inviteManagement: InviteManagement): string {
  return inviteManagement.assignableRoles[0]?.value ?? "";
}
