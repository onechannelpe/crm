import {
  createAsync,
  revalidate as revalidateQuery,
  useAction,
  useSubmissions,
} from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import { createTeamInvite } from "~/actions/team";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import Mail from "~/components/icons/mail";
import Search from "~/components/icons/search";
import User from "~/components/icons/user";
import X from "~/components/icons/x";
import {
  AppPage,
  AppPageSection,
  AppPageSectionTitle,
} from "~/components/layout/page";
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
import { teamDirectoryQuery } from "~/lib/queries/team";

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
  const inviteManagement = () => directory()?.inviteManagement ?? null;
  const canCopyInviteLink = createMemo(
    () =>
      inviteManagement()?.inviteLink.status === "enabled" &&
      !!inviteManagement()?.inviteLink.url,
  );

  const filteredMembers = createMemo(() => {
    const snapshot = directory();
    const value = searchFilter().trim().toLowerCase();
    if (!snapshot) return [];

    if (!value) {
      return snapshot.members;
    }

    return snapshot.members.filter((member) => {
      const memberFullName = member.fullName.toLowerCase();
      const memberEmail = member.email.toLowerCase();
      return memberFullName.includes(value) || memberEmail.includes(value);
    });
  });

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

  return (
    <AppPage class={styles.page}>
      <Show when={inviteManagement()}>
        {(invites) => (
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
                  <For each={invites().assignableRoles}>
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
                  <For each={invites().teams}>
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
                title="Invitar por enlace"
                description="Comparte este enlace para invitar usuarios a tu espacio."
              />
              <div class={styles.linkRow}>
                <Input
                  value={
                    invites().inviteLink.url ??
                    "Enlace público de invitación no habilitado"
                  }
                  disabled
                  aria-label="Enlace público de invitación"
                />
                <Button
                  disabled={!canCopyInviteLink()}
                  title={
                    canCopyInviteLink()
                      ? "Copiar enlace"
                      : "Enlace de invitación no disponible"
                  }
                  onClick={() => {
                    void handleCopyInviteLink();
                  }}
                >
                  Copiar enlace
                </Button>
              </div>
              <Show when={invites().inviteLink.reason}>
                <p class={styles.linkHint}>{invites().inviteLink.reason}</p>
              </Show>
            </AppPageSection>

            <AppPageSection>
              <AppPageSectionTitle
                title="Invitaciones pendientes"
                description="Gestiona invitaciones activas y su fecha de expiración."
              />
              <Show
                when={invites().pendingInvites.length > 0}
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
                    <For each={invites().pendingInvites}>
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

      <AppPageSection>
        <AppPageSectionTitle
          title="Gestionar miembros"
          description="Busca y revisa los miembros activos de la sucursal."
        />
        <div class={styles.searchWrap}>
          <div class={styles.searchField}>
            <Search size={14} class={styles.searchIcon} />
            <Input
              aria-label="Buscar miembros"
              class={styles.searchInput}
              placeholder="Buscar un miembro del equipo..."
              value={searchFilter()}
              onInput={(event) => setSearchFilter(event.currentTarget.value)}
            />
          </div>
        </div>
        <Show
          when={filteredMembers().length > 0}
          fallback={
            <EmptyState
              title="No hay miembros"
              description={
                searchFilter().trim()
                  ? "No hay coincidencias para tu búsqueda."
                  : "No se encontraron usuarios activos para esta sucursal."
              }
            />
          }
        >
          <Table class={styles.tableCompact}>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={filteredMembers()}>
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
                        {member.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </AppPageSection>
    </AppPage>
  );
}
