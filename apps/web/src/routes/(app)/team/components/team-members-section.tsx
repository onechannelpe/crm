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

  return (
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
