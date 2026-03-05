import {
  createAsync,
  revalidate as revalidateQuery,
  useAction,
  useSubmissions,
} from "@solidjs/router";
import { createMemo, createSignal, Show } from "solid-js";

import { createTeamInvite } from "~/actions/team";
import { Loading } from "~/components/feedback/loading";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { getErrorMessage } from "~/lib/errors";
import {
  resendTeamInviteMutation,
  revokeTeamInviteMutation,
} from "~/lib/mutations/team";
import { teamDirectoryQuery } from "~/lib/queries/team";

import { TeamInviteManagementSection } from "./components/team-invite-management-section";
import { TeamMembersSection } from "./components/team-members-section";

import styles from "./team-page.module.css";

export default function TeamPage() {
  const directory = createAsync(() => teamDirectoryQuery());
  const resendInvite = useAction(resendTeamInviteMutation);
  const revokeInvite = useAction(revokeTeamInviteMutation);
  const resendSubmissions = useSubmissions(resendTeamInviteMutation);
  const revokeSubmissions = useSubmissions(revokeTeamInviteMutation);
  const [searchFilter, setSearchFilter] = createSignal("");
  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("executive");
  const [teamId, setTeamId] = createSignal("");
  const [savingInvite, setSavingInvite] = createSignal(false);

  const { showToast } = useToast();
  const inviteManagement = createMemo(
    () => directory()?.inviteManagement ?? null,
  );
  const canCopyInviteLink = createMemo(
    () =>
      inviteManagement()?.inviteLink.status === "enabled" &&
      !!inviteManagement()?.inviteLink.url,
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

  async function handleCreateInvite(event: Event): Promise<void> {
    event.preventDefault();
    if (!inviteManagement()) return;

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
      setRole(inviteManagement()?.assignableRoles[0]?.value ?? "");
      setTeamId("");
      await revalidateQuery(teamDirectoryQuery.key);
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

  async function handleCopyInviteLink(): Promise<void> {
    const inviteUrl = inviteManagement()?.inviteLink.url;
    if (!inviteUrl || !canCopyInviteLink()) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast("success", "Enlace copiado");
    } catch {
      showToast("error", "No se pudo copiar el enlace");
    }
  }

  return (
    <AppPage class={styles.page}>
      <Show when={directory()} fallback={<Loading />} keyed>
        {(_directory) => (
          <>
            <Show when={inviteManagement()}>
              {(currentInviteManagement) => (
                <TeamInviteManagementSection
                  inviteManagement={currentInviteManagement()}
                  fullName={fullName()}
                  email={email()}
                  role={role()}
                  teamId={teamId()}
                  savingInvite={savingInvite()}
                  canCopyInviteLink={canCopyInviteLink()}
                  isResendPending={isResendPending}
                  isRevokePending={isRevokePending}
                  onFullNameInput={setFullName}
                  onEmailInput={setEmail}
                  onRoleInput={setRole}
                  onTeamIdInput={setTeamId}
                  onCreateInvite={(event) => {
                    void handleCreateInvite(event);
                  }}
                  onCopyInviteLink={() => {
                    void handleCopyInviteLink();
                  }}
                  onResendInvite={(inviteId) => {
                    void handleResend(inviteId);
                  }}
                  onRevokeInvite={(inviteId) => {
                    void handleRevoke(inviteId);
                  }}
                />
              )}
            </Show>
            <TeamMembersSection
              members={directory()?.members ?? []}
              searchFilter={searchFilter()}
              onSearchFilterInput={setSearchFilter}
            />
          </>
        )}
      </Show>
    </AppPage>
  );
}
