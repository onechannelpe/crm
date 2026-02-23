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
import { createAppQuery } from "~/lib/ui/create-app-query";

import styles from "./team-page.module.css";

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
      showToast("success", "Invite resent");
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to resend invite"));
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleRevoke(inviteId: number): Promise<void> {
    setPendingActionId(inviteId);
    try {
      await revokeTeamInvite(inviteId);
      showToast("success", "Invite revoked");
      await refetch();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to revoke invite"));
    } finally {
      setPendingActionId(null);
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
                            disabled={pendingActionId() === invite.inviteId}
                            onClick={() => {
                              void handleResend(invite.inviteId);
                            }}
                          >
                            Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={pendingActionId() === invite.inviteId}
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
