import { For, Show } from "solid-js";

import type { TeamMember } from "~/actions/team/types";
import { EmptyState } from "~/components/feedback/empty-state";
import Mail from "~/components/icons/mail";
import Search from "~/components/icons/search";
import User from "~/components/icons/user";
import { AppPageSection, AppPageSectionTitle } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Input } from "~/components/ui/input/input";
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
import { longName } from "~/lib/users/display-name";

import styles from "../team-page.module.css";

interface TeamMembersSectionProps {
  members: TeamMember[];
  searchFilter: string;
  onSearchFilterInput: (value: string) => void;
}

function getExtensionStatusVariant(
  status: TeamMember["extensionStatus"],
): "outline" | "secondary" | "warning" | "success" | "info" | "destructive" {
  switch (status) {
    case "ready":
    case "wrap_up":
      return "secondary";
    case "dialing":
      return "warning";
    case "active":
      return "success";
    case "sync_pending":
      return "info";
    case "sync_error":
      return "destructive";
    case "idle":
    case "offline":
    case null:
      return "outline";
  }
}

function getExtensionStatusLabel(status: TeamMember["extensionStatus"]): string {
  switch (status) {
    case "idle":
      return "Sin handoff";
    case "ready":
      return "Listo";
    case "dialing":
      return "Marcando";
    case "active":
      return "En llamada";
    case "wrap_up":
      return "Cierre";
    case "sync_pending":
      return "Pendiente";
    case "sync_error":
      return "Error sync";
    case "offline":
      return "Offline";
    case null:
      return "Sin datos";
  }
}

function filterMembers(
  members: TeamMember[],
  searchFilter: string,
): TeamMember[] {
  const value = searchFilter.trim().toLowerCase();
  if (!value) {
    return members;
  }

  return members.filter((member) => {
    const memberFullName = longName(member).toLowerCase();
    const memberEmail = member.email.toLowerCase();
    return memberFullName.includes(value) || memberEmail.includes(value);
  });
}

export function TeamMembersSection(props: TeamMembersSectionProps) {
  const filteredMembers = () =>
    filterMembers(props.members, props.searchFilter);

  const soonExpiringCount = () => {
    const threshold = Date.now() + 30 * 86_400_000;
    return props.members.filter(
      (m) => m.isActive && m.expiresAt !== null && m.expiresAt <= threshold,
    ).length;
  };

  return (
    <AppPageSection>
      <AppPageSectionTitle
        title="Gestionar miembros"
        description="Busca y revisa los miembros activos de la sucursal."
        actions={
          <Show when={soonExpiringCount() > 0}>
            <Badge variant="warning">
              {soonExpiringCount()} vencen en 30 d
            </Badge>
          </Show>
        }
      />
      <div class={styles.searchWrap}>
        <div class={styles.searchField}>
          <Search size={14} class={styles.searchIcon} />
          <Input
            aria-label="Buscar miembros"
            class={styles.searchInput}
            placeholder="Buscar un miembro del equipo..."
            value={props.searchFilter}
            onInput={(event) =>
              props.onSearchFilterInput(event.currentTarget.value)
            }
          />
        </div>
      </div>
      <Show
        when={filteredMembers().length > 0}
        fallback={
          <EmptyState
            title="No hay miembros"
            description={
              props.searchFilter.trim()
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
              <TableHead>Extensión</TableHead>
              <TableHead>Vencimiento</TableHead>
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
                      <span>{longName(member)}</span>
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
                  <TableCell>
                    <Badge variant={getExtensionStatusVariant(member.extensionStatus)}>
                      {getExtensionStatusLabel(member.extensionStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Show when={member.expiresAt !== null}>
                      <Badge variant={getExpiryBadgeVariant(member.expiresAt!)}>
                        {getExpiryText(member.expiresAt!)}
                      </Badge>
                    </Show>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </AppPageSection>
  );
}

function getExpiryBadgeVariant(
  expiresAt: number,
): "destructive" | "warning" | "default" {
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  if (daysLeft <= 7) return "destructive";
  if (daysLeft <= 30) return "warning";
  return "default";
}

function getExpiryText(expiresAt: number): string {
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  if (daysLeft <= 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  if (daysLeft <= 30) return `Vence en ${daysLeft} d`;
  return new Date(expiresAt).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
