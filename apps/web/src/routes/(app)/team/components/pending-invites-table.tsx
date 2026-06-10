import { useAction, useSubmissions } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import type { TeamInvite } from "~/actions/team/contracts";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import Mail from "~/components/icons/mail";
import X from "~/components/icons/x";
import { AppPageSection, AppPageSectionTitle } from "~/components/layout/page";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
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
import {
  resendTeamInviteMutation,
  revokeTeamInviteMutation,
} from "~/lib/mutations/team";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "../team-page.module.css";

export function PendingInvitesTable(props: { invites: TeamInvite[] }) {
  const resendInvite = useAction(resendTeamInviteMutation);
  const revokeInvite = useAction(revokeTeamInviteMutation);
  const resendSubmissions = useSubmissions(resendTeamInviteMutation);
  const revokeSubmissions = useSubmissions(revokeTeamInviteMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [pendingRevokeId, setPendingRevokeId] = createSignal<number | null>(
    null,
  );

  const isResendPending = (inviteId: number) =>
    resendSubmissions.some(
      (submission) => submission.pending && submission.input[0] === inviteId,
    );

  const isRevokePending = (inviteId: number) =>
    revokeSubmissions.some(
      (submission) => submission.pending && submission.input[0] === inviteId,
    );

  async function handleResend(inviteId: number): Promise<void> {
    try {
      const { message } = await resendInvite(inviteId);
      enqueueSuccessSnackBar(message);
    } catch (err: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(err));
    }
  }

  async function confirmRevoke(): Promise<void> {
    const inviteId = pendingRevokeId();

    if (inviteId === null) {
      return;
    }

    try {
      const { message } = await revokeInvite(inviteId);
      enqueueSuccessSnackBar(message);
    } catch (err: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(err));
    }

    setPendingRevokeId(null);
  }

  return (
    <>
      <ConfirmDialog
        isOpen={pendingRevokeId() !== null}
        title="Revocar invitación"
        description="La persona no podrá usar este enlace para unirse al equipo."
        confirmLabel="Revocar"
        loading={isRevokePending(pendingRevokeId() ?? -1)}
        onConfirm={() => void confirmRevoke()}
        onClose={() => setPendingRevokeId(null)}
      />

      <AppPageSection>
        <AppPageSectionTitle
          title="Invitaciones pendientes"
          description="Gestiona invitaciones activas y su fecha de expiración."
        />

        <Show
          when={props.invites.length > 0}
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
              <For each={props.invites}>
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
                          disabled={isResendPending(invite.inviteId)}
                          title="Reenviar invitación"
                          onClick={() => void handleResend(invite.inviteId)}
                        >
                          <Mail size={14} />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Revocar invitación"
                          disabled={isRevokePending(invite.inviteId)}
                          title="Revocar invitación"
                          onClick={() => setPendingRevokeId(invite.inviteId)}
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
