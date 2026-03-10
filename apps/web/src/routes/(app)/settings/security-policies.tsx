import { createAsync, useAction } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
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
import { upsertAuditPolicyMutation } from "~/lib/mutations/audit";
import {
  auditPolicySnapshotQuery,
  canManageAuditPoliciesQuery,
} from "~/lib/queries/audit";

import auditStyles from "../audit/audit-page.module.css";
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
    <div class={styles.content}>
      <SettingsSection title="Políticas de riesgo de auditoría">
        <div class={auditStyles.filterRow}>
          <div class={auditStyles.fieldW52}>
            <Input
              label="Acción"
              value={policyAction()}
              onInput={(e) => setPolicyAction(e.currentTarget.value)}
              placeholder="leads_requested"
            />
          </div>
          <div class={auditStyles.fieldW36}>
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
          <Button
            disabled={!canManagePolicies()}
            onClick={() => {
              void savePolicy();
            }}
          >
            Guardar política
          </Button>
        </div>
        <p class={auditStyles.helperText}>
          Las acciones sin política explícita se tratan como de alto riesgo para
          evitar ocultar eventos críticos.
        </p>
        <p class={auditStyles.helperText}>
          Solo admin y superuser pueden editar políticas.
        </p>
        <p class={auditStyles.errorText}>{policyError() ?? ""}</p>
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
                  <TableCell class={auditStyles.strong}>
                    {item.action}
                  </TableCell>
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
      </SettingsSection>
    </div>
  );
}
