import { A, createAsync, useAction, useSubmissions } from "@solidjs/router";
import { For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Mail from "~/components/icons/mail";
import User from "~/components/icons/user";
import { AppPage } from "~/components/layout/page";
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
import { getErrorMessage } from "~/lib/errors";
import {
  resendTeamInviteMutation,
  revokeTeamInviteMutation,
} from "~/lib/mutations/team";
import { teamDirectoryQuery } from "~/lib/queries/team";

import styles from "./team-page.module.css";

export default function TeamPage() {
  const directory = createAsync(() => teamDirectoryQuery(), {
    initialValue: {
      members: [],
      pendingInvites: [],
      canManageInvites: false,
    },
  });
  const resendInvite = useAction(resendTeamInviteMutation);
  const revokeInvite = useAction(revokeTeamInviteMutation);
  const resendSubmissions = useSubmissions(resendTeamInviteMutation);
  const revokeSubmissions = useSubmissions(revokeTeamInviteMutation);

  const { showToast } = useToast();
  const canManageInviteActions = () => directory().canManageInvites;

  const isResendPending = (inviteId: number) =>
    resendSubmissions.some((s) => s.pending && s.input[0] === inviteId);
  const isRevokePending = (inviteId: number) =>
    revokeSubmissions.some((s) => s.pending && s.input[0] === inviteId);

  async function handleResend(inviteId: number): Promise<void> {
    try {
      await resendInvite(inviteId);
      showToast("success", "Invite resent");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to resend invite"));
    }
  }

  async function handleRevoke(inviteId: number): Promise<void> {
    try {
      await revokeInvite(inviteId);
      showToast("success", "Invite revoked");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to revoke invite"));
    }
  }

  return (
    <AppPage>
      <Show when={directory().canManageInvites}>
        <div class={styles.toolbar}>
          <A href="/team/new">
            <Button>Invite member</Button>
          </A>
        </div>
      </Show>

      <Show
        when={directory().members.length > 0}
        fallback={
          <EmptyState
            title="No team members"
            description="No active users found for this branch."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={directory().members}>
              {(member) => (
                <TableRow>
                  <TableCell class={styles.memberName}>
                    <div class={styles.personCell}>
                      <div class={styles.avatar}>
                        <User size={16} />
                      </div>
                      <span>{member.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class={styles.mailCell}>
                      <Mail size={12} />
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
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>

      <div class={styles.section}>
        <h2 class={styles.sectionTitle}>Pending invites</h2>
        <Show
          when={directory().pendingInvites.length > 0}
          fallback={
            <EmptyState
              title="No pending invites"
              description="All invites are already resolved."
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={directory().pendingInvites}>
                {(invite) => (
                  <TableRow>
                    <TableCell class={styles.memberName}>
                      {invite.fullName}
                    </TableCell>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invite.role)}>
                        {getRoleLabel(invite.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expiresAt).toLocaleString("en-US")}
                    </TableCell>
                    <TableCell>
                      <Show
                        when={canManageInviteActions()}
                        fallback={
                          <span class={styles.noPermission}>No permission</span>
                        }
                      >
                        <div class={styles.actions}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isResendPending(invite.inviteId)}
                            onClick={() => {
                              void handleResend(invite.inviteId);
                            }}
                          >
                            Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isRevokePending(invite.inviteId)}
                            onClick={() => {
                              void handleRevoke(invite.inviteId);
                            }}
                          >
                            Revoke
                          </Button>
                        </div>
                      </Show>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </div>
    </AppPage>
  );
}
