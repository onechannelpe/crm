import { createAsync, useAction } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { upsertAuditPolicyMutation } from "~/lib/mutations/audit";
import {
  auditPolicySnapshotQuery,
  canManageAuditPoliciesQuery,
} from "~/lib/queries/audit";

import styles from "./settings-page.module.css";

function parseRiskLevel(value: string): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

export default function SecurityPoliciesPage() {
  const [policyAction, setPolicyAction] = createSignal("");
  const [policyRiskLevel, setPolicyRiskLevel] = createSignal<
    "high" | "medium" | "low"
  >("medium");
  const [policyIsActive, setPolicyIsActive] = createSignal(true);
  const [policyError, setPolicyError] = createSignal<string | null>(null);

  const policySnapshot = createAsync(() => auditPolicySnapshotQuery(), {
    initialValue: { items: [] },
  });
  const canManagePolicies = createAsync(() => canManageAuditPoliciesQuery(), {
    initialValue: false,
  });

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
    <>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead>Riesgo</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead>Protegido</TableHead>
              <TableHead>Actualizada por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={policySnapshot().items}>
              {(item) => (
                <TableRow>
                  <TableCell class={styles.strong}>{item.action}</TableCell>
                  <TableCell>{item.riskLevel}</TableCell>
                  <TableCell>{item.isActive ? "sí" : "no"}</TableCell>
                  <TableCell>{item.isProtected ? "sí" : "no"}</TableCell>
                  <TableCell>
                    {item.updatedByUserId ? `#${item.updatedByUserId}` : "-"}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
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
    </>
  );
}
