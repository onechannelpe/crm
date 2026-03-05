import { For, Show } from "solid-js";

import type { TeamInviteManagement } from "~/actions/team/types";
import { EmptyState } from "~/components/feedback/empty-state";
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

import styles from "../team-page.module.css";

interface TeamInviteManagementSectionProps {
  inviteManagement: TeamInviteManagement;
  fullName: string;
  email: string;
  role: string;
  teamId: string;
  savingInvite: boolean;
  canCopyInviteLink: boolean;
  isResendPending: (inviteId: number) => boolean;
  isRevokePending: (inviteId: number) => boolean;
  onFullNameInput: (value: string) => void;
  onEmailInput: (value: string) => void;
  onRoleInput: (value: string) => void;
  onTeamIdInput: (value: string) => void;
  onCreateInvite: (event: Event) => void;
  onCopyInviteLink: () => void;
  onResendInvite: (inviteId: number) => void;
  onRevokeInvite: (inviteId: number) => void;
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

export function TeamInviteManagementSection(
  props: TeamInviteManagementSectionProps,
) {
  return (
    <>
      <AppPageSection>
        <AppPageSectionTitle
          title="Invitar por correo"
          description="Envía una invitación por correo a nuevos miembros del equipo."
        />
        <form
          class={styles.inviteForm}
          onSubmit={(event) => {
            props.onCreateInvite(event);
          }}
        >
          <Input
            label="Nombre completo"
            value={props.fullName}
            onInput={(event) =>
              props.onFullNameInput(event.currentTarget.value)
            }
            required
          />
          <Input
            type="email"
            label="Correo corporativo"
            value={props.email}
            onInput={(event) => props.onEmailInput(event.currentTarget.value)}
            required
          />
          <Select
            label="Rol"
            value={props.role}
            onInput={(event) => props.onRoleInput(event.currentTarget.value)}
          >
            <For each={props.inviteManagement.assignableRoles}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>
          <Select
            label="Equipo (opcional)"
            value={props.teamId}
            onInput={(event) => props.onTeamIdInput(event.currentTarget.value)}
          >
            <option value="">Sin equipo</option>
            <For each={props.inviteManagement.teams}>
              {(team) => <option value={team.id}>{team.name}</option>}
            </For>
          </Select>
          <div class={styles.inviteActions}>
            <Button type="submit" disabled={props.savingInvite}>
              {props.savingInvite ? "Enviando..." : "Enviar invitación"}
            </Button>
          </div>
        </form>
      </AppPageSection>

      <AppPageSection>
        <AppPageSectionTitle
          title="Invitar por enlace"
          description="Comparte este enlace para invitar usuarios a tu espacio."
        />
        <div class={styles.linkRow}>
          <Input
            value={
              props.inviteManagement.inviteLink.url ??
              "Enlace público de invitación no habilitado"
            }
            disabled
            aria-label="Enlace público de invitación"
          />
          <Button
            disabled={!props.canCopyInviteLink}
            title={
              props.canCopyInviteLink
                ? "Copiar enlace"
                : "Enlace de invitación no disponible"
            }
            onClick={props.onCopyInviteLink}
          >
            Copiar enlace
          </Button>
        </div>
        <Show when={props.inviteManagement.inviteLink.reason}>
          <p class={styles.linkHint}>
            {props.inviteManagement.inviteLink.reason}
          </p>
        </Show>
      </AppPageSection>

      <AppPageSection>
        <AppPageSectionTitle
          title="Invitaciones pendientes"
          description="Gestiona invitaciones activas y su fecha de expiración."
        />
        <Show
          when={props.inviteManagement.pendingInvites.length > 0}
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
              <For each={props.inviteManagement.pendingInvites}>
                {(invite) => (
                  <TableRow>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{getExpiresAtText(invite.expiresAt)}</TableCell>
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
                          disabled={props.isResendPending(invite.inviteId)}
                          title="Reenviar invitación"
                          onClick={() => {
                            props.onResendInvite(invite.inviteId);
                          }}
                        >
                          <Mail size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Revocar invitación"
                          disabled={props.isRevokePending(invite.inviteId)}
                          title="Revocar invitación"
                          onClick={() => {
                            props.onRevokeInvite(invite.inviteId);
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
  );
}
