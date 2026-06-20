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
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { AuditActionPolicyItem } from "~/contracts/audit-reader/policy";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { upsertAuditPolicyMutation } from "~/lib/mutations/audit";
import {
  auditPolicySnapshotQuery,
  canManageAuditPoliciesQuery,
} from "~/lib/queries/audit";

import styles from "./settings-page.module.css";

type PolicyRiskLevel = "high" | "medium" | "low";
type SecurityPolicyRow = AuditActionPolicyItem & { id: string };

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
] satisfies ReadonlyArray<DataGridColumn<SecurityPolicyRow>>;

function parseRiskLevel(value: string): PolicyRiskLevel {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

export default function SecurityPoliciesPage() {
  const [policyAction, setPolicyAction] = createSignal("");
  const [policyRiskLevel, setPolicyRiskLevel] =
    createSignal<PolicyRiskLevel>("medium");
  const [policyIsActive, setPolicyIsActive] = createSignal(true);
  const [policyError, setPolicyError] = createSignal<string | null>(null);

  const policySnapshot = createAsync(() => auditPolicySnapshotQuery());
  const canManagePolicies = createAsync(() => canManageAuditPoliciesQuery(), {
    initialValue: false,
  });

  const rows = createMemo<SecurityPolicyRow[]>(() =>
    (policySnapshot()?.items ?? []).map((item, index) =>
      Object.assign({}, item, {
        id: `security-policy:${item.action}:${index}`,
      }),
    ),
  );
  const isLoading = () => policySnapshot() === undefined;

  const saveAuditPolicy = useAction(upsertAuditPolicyMutation);
  const canSubmit = createMemo(
    () => canManagePolicies() && policyAction().trim().length > 0,
  );

  async function savePolicy(): Promise<void> {
    setPolicyError(null);
    try {
      await saveAuditPolicy({
        action: policyAction(),
        riskLevel: policyRiskLevel(),
        isActive: policyIsActive(),
      });
    } catch {
      setPolicyError(
        "No se pudo guardar la política. Revisa los valores y los permisos.",
      );
    }
  }

  return (
    <SettingsSection title="Políticas de riesgo de auditoría">
      <FilterBar>
        <div style={{ width: "13rem" }}>
          <Input
            label="Acción"
            value={policyAction()}
            onInput={(e) => setPolicyAction(e.currentTarget.value)}
            placeholder="leads_requested"
          />
        </div>
        <div style={{ width: "9rem" }}>
          <Select
            label="Nivel de riesgo"
            value={policyRiskLevel()}
            onInput={(e) =>
              setPolicyRiskLevel(parseRiskLevel(e.currentTarget.value))
            }
          >
            <option value="high">alto</option>
            <option value="medium">medio</option>
            <option value="low">bajo</option>
          </Select>
        </div>
        <Checkbox
          label="Activo"
          checked={policyIsActive()}
          onInput={(e) => setPolicyIsActive(e.currentTarget.checked)}
        />
      </FilterBar>
      <p class={styles.helperText}>
        Las acciones sin política explícita se tratan como de alto riesgo para
        evitar ocultar eventos críticos.
      </p>
      <p class={styles.helperText}>
        Solo admin y superuser pueden editar políticas.
      </p>
      <p class={styles.errorText}>{policyError() ?? ""}</p>
      <DataGrid
        ariaLabel="Políticas de seguridad"
        columns={[...SECURITY_POLICY_COLUMNS]}
        emptyState={
          <p class="px-3 py-4 text-sm text-muted-foreground">
            No hay políticas registradas.
          </p>
        }
        rowOpen={createNoopRowOpen()}
        source={{
          status: isLoading() ? "pending" : "ready",
          rows: rows(),
        }}
      />
      <div class={styles.formActions}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canSubmit()}
          onClick={() => {
            void savePolicy();
          }}
        >
          Guardar política
        </Button>
      </div>
    </SettingsSection>
  );
}
