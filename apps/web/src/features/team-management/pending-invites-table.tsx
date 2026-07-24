import { useAction, useSubmissions } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import Link from "~/components/icons/link";
import Mail from "~/components/icons/mail";
import Trash from "~/components/icons/trash";
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
import type { TeamInvite } from "~/contracts/team";
import {
  resendTeamInviteMutation,
  revokeTeamInviteMutation,
} from "~/features/team-management/data/team-mutations";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./team-management.module.css";

export function PendingInvitesTable(props: {
  invites: TeamInvite[];
  evaluatedAt: number;
}) {
  const resendInvite = useAction(resendTeamInviteMutation);
  const revokeInvite = useAction(revokeTeamInviteMutation);
  const resendSubmissions = useSubmissions(resendTeamInviteMutation);
  const revokeSubmissions = useSubmissions(revokeTeamInviteMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [pendingRevokeId, setPendingRevokeId] = createSignal<string | null>(
    null,
  );

  const isResendPending = (inviteId: string) =>
    resendSubmissions.some(
      (submission) => submission.pending && submission.input[0] === inviteId,
    );

  const isRevokePending = (inviteId: string) =>
    revokeSubmissions.some(
      (submission) => submission.pending && submission.input[0] === inviteId,
    );

  async function handleCopyLink(inviteUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      enqueueSuccessSnackBar("Enlace de invitación copiado");
    } catch {
      enqueueErrorSnackBar("No se pudo copiar el enlace");
    }
  }

  async function handleResend(inviteId: string): Promise<void> {
    try {
      const { message } = await resendInvite(inviteId);
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
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
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
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
        loading={isRevokePending(pendingRevokeId() ?? "")}
        onConfirm={() => void confirmRevoke()}
        onClose={() => setPendingRevokeId(null)}
      />

      <Show when={props.invites.length > 0}>
        <Table
          class={styles.invitesTable}
          aria-label="Invitaciones pendientes"
          variant="list"
        >
          <colgroup>
            <col style={{ width: "50%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "128px" }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead align="center">Vence</TableHead>
              <TableHead align="right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={props.invites}>
              {(invite) => (
                <TableRow>
                  <TableCell>
                    <span class={styles.inviteMailIcon} aria-hidden="true">
                      <Mail size={16} />
                    </span>
                    <span class={styles.rosterName}>{invite.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(invite.role)}>
                      {getRoleLabel(invite.role)}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant="secondary">
                      {getExpiresAtText(invite.expiresAt, props.evaluatedAt)}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <div class={styles.actions}>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Copiar enlace de invitación"
                        title="Copiar enlace"
                        onClick={() => void handleCopyLink(invite.inviteUrl)}
                      >
                        <Link size={14} />
                      </Button>

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
                        <Trash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </>
  );
}

function getExpiresAtText(expiresAt: number, evaluatedAt: number): string {
  if (expiresAt <= evaluatedAt) {
    return "Expirada";
  }

  const minutes = Math.floor((expiresAt - evaluatedAt) / (1000 * 60));

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
