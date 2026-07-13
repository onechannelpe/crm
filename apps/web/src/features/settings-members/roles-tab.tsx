import { useNavigate } from "@solidjs/router";
import { For } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table-grid/table-grid";
import { getPermissions, ROLES } from "~/lib/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";

import styles from "./settings-members.module.css";

const ROLE_COLUMNS = "260px 1fr 40px";

export function RolesTab() {
  const navigate = useNavigate();

  return (
    <SettingsSection
      title="Roles"
      description="Los roles determinan los permisos. Son fijos y se asignan a cada usuario desde su detalle."
    >
      <Table aria-label="Roles">
        <TableRow gridTemplateColumns={ROLE_COLUMNS}>
          <TableHeader>Nombre</TableHeader>
          <TableHeader align="right">Permisos</TableHeader>
          <TableHeader align="right"> </TableHeader>
        </TableRow>

        <For each={ROLES}>
          {(role) => (
            <TableRow
              gridTemplateColumns={ROLE_COLUMNS}
              clickable
              onClick={() => navigate(`/settings/members/roles/${role}`)}
            >
              <TableCell>
                <Badge variant={getRoleBadgeVariant(role)}>
                  {getRoleLabel(role)}
                </Badge>
              </TableCell>
              <TableCell align="right" class={styles.roleCount}>
                {getPermissions(role).length} permisos
              </TableCell>
              <TableCell align="right" class={styles.rosterChevron}>
                <ChevronRight size={16} />
              </TableCell>
            </TableRow>
          )}
        </For>
      </Table>
    </SettingsSection>
  );
}
