import { createAsync, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Avatar } from "~/components/ui/display/avatar";
import { Badge } from "~/components/ui/display/badge";
import { SearchInput } from "~/components/ui/input/search-input";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table-grid/table-grid";
import type { MemberListItem } from "~/contracts/members";
import { membersRosterQuery } from "~/lib/queries/members";
import { shortName } from "~/lib/users/display-name";

import styles from "./settings-members.module.css";

const ROSTER_COLUMNS = "200px minmax(0, 1fr) 120px 40px";

function statusBadge(member: MemberListItem) {
  if (!member.isActive)
    return { variant: "secondary", label: "Inactivo" } as const;
  if (!member.onboardingCompleted) {
    return { variant: "warning", label: "Pendiente" } as const;
  }
  return { variant: "success", label: "Activo" } as const;
}

export function TeamTab() {
  const navigate = useNavigate();
  const { currentUser } = useAuthenticatedSession();
  const roster = createAsync(() => membersRosterQuery());
  const [filter, setFilter] = createSignal("");

  const filtered = createMemo(() => {
    const members = roster()?.members ?? [];
    const value = filter().trim().toLowerCase();
    if (!value) return members;
    return members.filter((member) =>
      `${shortName(member)} ${member.email}`.toLowerCase().includes(value),
    );
  });

  const isSelf = (member: MemberListItem) => member.id === currentUser().id;

  // Roster never navigates into the actor's own row.
  function openMember(member: MemberListItem) {
    if (isSelf(member)) return;
    navigate(`/settings/members/${member.id}`);
  }

  return (
    <SettingsSection
      title="Miembros"
      description="Gestiona los miembros de tu espacio de trabajo."
    >
      <div class={styles.rosterSearch}>
        <SearchInput
          value={filter()}
          onValueChange={setFilter}
          placeholder="Buscar un miembro..."
          aria-label="Buscar miembro"
        />
      </div>

      <Table aria-label="Miembros del equipo">
        <TableRow gridTemplateColumns={ROSTER_COLUMNS}>
          <TableHeader>Nombre</TableHeader>
          <TableHeader>Correo</TableHeader>
          <TableHeader>Estado</TableHeader>
          <TableHeader align="right"> </TableHeader>
        </TableRow>

        <Show
          when={filtered().length > 0}
          fallback={
            <TableRow>
              <TableCell class={styles.rosterEmpty}>
                {filter()
                  ? "Ningún miembro coincide con tu búsqueda."
                  : "No hay miembros."}
              </TableCell>
            </TableRow>
          }
        >
          <For each={filtered()}>
            {(member) => {
              const status = statusBadge(member);
              return (
                <TableRow
                  gridTemplateColumns={ROSTER_COLUMNS}
                  clickable={!isSelf(member)}
                  onClick={() => openMember(member)}
                >
                  <TableCell>
                    <Avatar
                      class={styles.rosterAvatar}
                      imageUrl={member.avatarUrl}
                      fallback={getUserInitials(shortName(member))}
                    />
                    <span class={styles.rosterName}>{shortName(member)}</span>
                  </TableCell>
                  <TableCell ellipsis>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell align="right" class={styles.rosterChevron}>
                    <Show when={!isSelf(member)}>
                      <ChevronRight size={16} />
                    </Show>
                  </TableCell>
                </TableRow>
              );
            }}
          </For>
        </Show>
      </Table>
    </SettingsSection>
  );
}
