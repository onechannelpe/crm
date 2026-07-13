import { useNavigate } from "@solidjs/router";
import { For } from "solid-js";

import ChevronRight from "~/components/icons/chevron-right";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { getPermissions, ROLES } from "~/lib/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";

import styles from "./settings-members.module.css";

export function RolesTab() {
  const navigate = useNavigate();

  return (
    <SettingsSection
      title="Roles"
      description="Los roles determinan los permisos. Son fijos y se asignan a cada usuario desde su detalle."
    >
      <Table aria-label="Roles" variant="list">
        <colgroup>
          <col style={{ width: "260px" }} />
          <col />
          <col style={{ width: "40px" }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead align="right">Permisos</TableHead>
            <TableHead align="right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={ROLES}>
            {(role) => {
              const openRole = () =>
                navigate(`/settings/members/roles/${role}`);
              return (
                <TableRow
                  clickable
                  tabIndex={0}
                  onClick={openRole}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRole();
                    }
                  }}
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
              );
            }}
          </For>
        </TableBody>
      </Table>
    </SettingsSection>
  );
}
