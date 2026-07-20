import { createAsync, useAction } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import Activity from "~/components/icons/activity";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Lock from "~/components/icons/lock";
import UserRound from "~/components/icons/user-round";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { DataTable } from "~/components/ui/layout/data-table";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { TableColumn } from "~/components/ui/layout/table-column";
import type { AuditActionPolicyItem } from "~/contracts/audit-reader/policy";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { upsertAuditPolicyMutation } from "~/lib/mutations/audit";
import {
  auditPolicySnapshotQuery,
  canManageAuditPoliciesQuery,
} from "~/lib/queries/audit";

import styles from "./settings-page.module.css";

type PolicyRiskLevel = "high" | "medium" | "low";

const SECURITY_POLICY_COLUMNS = [
  {
    key: "action",
    label: "Acción",
    icon: Activity,
    minWidth: 220,
    grow: true,
    sticky: true,
    renderCell: (item) => <span class={styles.strong}>{item.action}</span>,
  },
  {
    key: "riskLevel",
    label: "Riesgo",
    icon: CircleQuestionMark,
    width: 120,
    renderCell: (item) => item.riskLevel,
  },
  {
    key: "isActive",
    label: "Activo",
    icon: Lock,
    width: 100,
    renderCell: (item) => (item.isActive ? "sí" : "no"),
  },
  {
    key: "isProtected",
    label: "Protegido",
    icon: Lock,
    width: 120,
    renderCell: (item) => (item.isProtected ? "sí" : "no"),
  },
  {
    key: "updatedByUserId",
    label: "Actualizada por",
    icon: UserRound,
    width: 150,
    renderCell: (item) =>
      item.updatedByUserId ? `#${item.updatedByUserId}` : "-",
  },
] satisfies ReadonlyArray<TableColumn<AuditActionPolicyItem>>;

function parseRiskLevel(value: string): PolicyRiskLevel {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

export default function SecurityPoliciesPage() {
  const [action, setAction] = createSignal("");
  const [riskLevel, setRiskLevel] = createSignal<PolicyRiskLevel>("medium");
  const [isActive, setIsActive] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const policySnapshot = createAsync(() => auditPolicySnapshotQuery());
  const canManagePolicies = createAsync(() => canManageAuditPoliciesQuery(), {
    initialValue: false,
  });

  const saveAuditPolicy = useAction(upsertAuditPolicyMutation);

  const rows = createMemo(() => policySnapshot()?.items ?? []);

  const canSubmit = createMemo(
    () => canManagePolicies() && action().trim().length > 0,
  );

  async function handleSave(): Promise<void> {
    const normalizedAction = action().trim();

    setErrorMessage(null);

    try {
      await saveAuditPolicy({
        action: normalizedAction,
        riskLevel: riskLevel(),
        isActive: isActive(),
      });
    } catch {
      setErrorMessage(
        "No se pudo guardar la política. Revisa los valores y los permisos.",
      );
    }
  }

  return (
    <SettingsPageLayout>
      <SettingsSection title="Políticas de riesgo de auditoría">
        <FilterBar>
          <div class={styles.filterAction}>
            <Input
              label="Acción"
              value={action()}
              onInput={(event) => setAction(event.currentTarget.value)}
              placeholder="leads_requested"
            />
          </div>

          <div class={styles.filterRiskLevel}>
            <Select
              label="Nivel de riesgo"
              value={riskLevel()}
              onInput={(event) =>
                setRiskLevel(parseRiskLevel(event.currentTarget.value))
              }
            >
              <option value="high">alto</option>
              <option value="medium">medio</option>
              <option value="low">bajo</option>
            </Select>
          </div>

          <Checkbox
            label="Activo"
            checked={isActive()}
            onInput={(event) => setIsActive(event.currentTarget.checked)}
          />
        </FilterBar>

        <p class={styles.helperText}>
          Las acciones sin política explícita se tratan como de alto riesgo para
          evitar ocultar eventos críticos.
        </p>

        <p class={styles.helperText}>
          Solo admin y superuser pueden editar políticas.
        </p>

        <p class={styles.errorText}>{errorMessage() ?? ""}</p>

        <DataTable
          ariaLabel="Políticas de seguridad"
          columns={SECURITY_POLICY_COLUMNS}
          emptyState="No hay políticas registradas."
          rows={rows()}
          status={policySnapshot() === undefined ? "pending" : "ready"}
        />

        <div class={styles.formActions}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canSubmit()}
            onClick={() => void handleSave()}
          >
            Guardar política
          </Button>
        </div>
      </SettingsSection>
    </SettingsPageLayout>
  );
}
