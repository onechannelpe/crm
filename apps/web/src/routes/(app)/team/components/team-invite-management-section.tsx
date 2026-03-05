import {
  createAsync,
  revalidate as revalidateQuery,
  useAction,
  useSubmissions,
} from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import { createTeamInvite } from "~/actions/team";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Mail from "~/components/icons/mail";
import X from "~/components/icons/x";
import { AppPageSection, AppPageSectionTitle } from "~/components/layout/page";
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
  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("executive");
  const [teamId, setTeamId] = createSignal("");
  const [savingInvite, setSavingInvite] = createSignal(false);
  const { showToast } = useToast();

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

  async function handleCreateInvite(event: Event): Promise<void> {
    event.preventDefault();
    const im = inviteManagement();
    if (!im) return;
    setSavingInvite(true);
    try {
      await createTeamInvite({
        fullName: fullName(),
        email: email(),
        role: role(),
        teamId: teamId() ? Number(teamId()) : null,
      });
      setFullName("");
      setEmail("");
      setRole(im.assignableRoles[0]?.value ?? "");
      setTeamId("");
      await revalidateQuery(inviteManagementQuery.key);
      showToast("success", "Invitación enviada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo crear la invitación"),
      );
    } finally {
      setSavingInvite(false);
    }
  }

  return (
    <Show when={inviteManagement()} keyed>
      {(im) => (
        <>
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
                label="Nombre completo"
                value={fullName()}
                onInput={(event) => setFullName(event.currentTarget.value)}
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
              <div class={styles.inviteActions}>
                <Button type="submit" disabled={savingInvite()}>
                  {savingInvite() ? "Enviando..." : "Enviar invitación"}
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
                                void handleRevoke(invite.inviteId);
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
