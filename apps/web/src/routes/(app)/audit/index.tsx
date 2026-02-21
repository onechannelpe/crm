import { createSignal, For } from "solid-js";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
  upsertAuditPolicy,
} from "~/actions/admin-audit-policy";
import { getAuditReaderSnapshot } from "~/actions/admin-audit-reader";
import { getObservabilitySnapshot } from "~/actions/admin-observability";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
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
import { createAppQuery } from "~/lib/ui/create-app-query";

const WINDOW_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours" },
] as const;

const AUDIT_WINDOW_OPTIONS = [
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours" },
  { value: 10080, label: "7 days" },
  { value: 43200, label: "30 days" },
] as const;

function parseStatus(value: string): "all" | "ok" | "error" {
  if (value === "ok" || value === "error") {
    return value;
  }
  return "all";
}

function parseActorUserId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function parseRiskLevel(value: string): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

export default function AuditObservabilityPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);
  const [status, setStatus] = createSignal<"all" | "ok" | "error">("all");
  const [auditWindowMinutes, setAuditWindowMinutes] = createSignal(1440);
  const [onlyHighRisk, setOnlyHighRisk] = createSignal(true);
  const [actionFilter, setActionFilter] = createSignal("");
  const [entityTypeFilter, setEntityTypeFilter] = createSignal("");
  const [actorUserIdFilter, setActorUserIdFilter] = createSignal("");
  const [policyAction, setPolicyAction] = createSignal("");
  const [policyRiskLevel, setPolicyRiskLevel] = createSignal<
    "high" | "medium" | "low"
  >("medium");
  const [policyIsActive, setPolicyIsActive] = createSignal(true);
  const [policyError, setPolicyError] = createSignal<string | null>(null);
  const [snapshot, { refetch }] = createAppQuery(
    async () =>
      getObservabilitySnapshot({
        windowMinutes: windowMinutes(),
        status: status() === "all" ? undefined : status(),
        limit: 80,
      }),
    {
      windowMinutes: 60,
      summary: [],
      recent: [],
    },
  );
  const [auditSnapshot, { refetch: refetchAuditSnapshot }] = createAppQuery(
    async () =>
      getAuditReaderSnapshot({
        windowMinutes: auditWindowMinutes(),
        limit: 80,
        onlyHighRisk: onlyHighRisk(),
        action: actionFilter().trim() || undefined,
        entityType: entityTypeFilter().trim() || undefined,
        actorUserId: parseActorUserId(actorUserIdFilter()),
      }),
    {
      windowMinutes: 1440,
      events: [],
    },
  );
  const [policySnapshot, { refetch: refetchPolicySnapshot }] = createAppQuery(
    () => getAuditPolicySnapshot(),
    {
      items: [],
    },
  );
  const [canManagePolicies] = createAppQuery(
    () => canManageAuditPolicies(),
    false,
  );

  async function savePolicy(): Promise<void> {
    setPolicyError(null);
    try {
      await upsertAuditPolicy({
        action: policyAction(),
        riskLevel: policyRiskLevel(),
        isActive: policyIsActive(),
      });
      await Promise.all([refetchPolicySnapshot(), refetchAuditSnapshot()]);
    } catch {
      setPolicyError("Failed to save policy. Check values and permissions.");
    }
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Admin"
        title="Audit and observability"
        description="Execution times, error rate, and event volume."
      />

      <section class="tw-record-index-panel flex flex-wrap items-end gap-3 p-4">
        <div class="w-44">
          <Select
            label="Window"
            value={windowMinutes()}
            onInput={(event) =>
              setWindowMinutes(Number(event.currentTarget.value))
            }
            class="h-10"
          >
            <For each={WINDOW_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>
        </div>
        <div class="w-40">
          <Select
            label="Status"
            value={status()}
            onInput={(event) =>
              setStatus(parseStatus(event.currentTarget.value))
            }
            class="h-10"
          >
            <option value="all">All</option>
            <option value="ok">OK</option>
            <option value="error">Errors</option>
          </Select>
        </div>
        <Button
          onClick={() => {
            void refetch();
          }}
        >
          Refresh
        </Button>
      </section>

      <section class="tw-record-index-panel flex flex-wrap items-end gap-3 p-4">
        <div class="w-44">
          <Select
            label="Audit window"
            value={auditWindowMinutes()}
            onInput={(event) =>
              setAuditWindowMinutes(Number(event.currentTarget.value))
            }
            class="h-10"
          >
            <For each={AUDIT_WINDOW_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>
        </div>
        <div class="w-52">
          <Input
            label="Action"
            value={actionFilter()}
            onInput={(event) => setActionFilter(event.currentTarget.value)}
            placeholder="charge_note_approved"
            class="h-10"
          />
        </div>
        <div class="w-44">
          <Input
            label="Entity"
            value={entityTypeFilter()}
            onInput={(event) => setEntityTypeFilter(event.currentTarget.value)}
            placeholder="charge_note"
            class="h-10"
          />
        </div>
        <div class="w-28">
          <Input
            label="Actor #"
            value={actorUserIdFilter()}
            onInput={(event) => setActorUserIdFilter(event.currentTarget.value)}
            placeholder="5"
            class="h-10"
          />
        </div>
        <Checkbox
          label="High risk only"
          checked={onlyHighRisk()}
          onInput={(event) => setOnlyHighRisk(event.currentTarget.checked)}
          class="mt-1"
        />
        <Button
          onClick={() => {
            void refetchAuditSnapshot();
          }}
        >
          Refresh audit
        </Button>
      </section>

      <section class="tw-record-index-panel space-y-3 p-4">
        <h2 class="text-base font-semibold">Summary by action</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accion</TableHead>
              <TableHead>Ejecuciones</TableHead>
              <TableHead>Errores</TableHead>
              <TableHead>Promedio (ms)</TableHead>
              <TableHead>Max (ms)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={snapshot().summary}>
              {(row) => (
                <TableRow>
                  <TableCell class="font-medium">{row.actionName}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{row.errorCount}</TableCell>
                  <TableCell>{Math.round(row.avgDurationMs)}</TableCell>
                  <TableCell>{Math.round(row.maxDurationMs)}</TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </section>

      <section class="tw-record-index-panel space-y-3 p-4">
        <h2 class="text-base font-semibold">Eventos recientes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Duracion</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={snapshot().recent}>
              {(row) => (
                <TableRow>
                  <TableCell>
                    {new Date(row.createdAt).toLocaleTimeString("es-PE")}
                  </TableCell>
                  <TableCell class="font-medium">{row.actionName}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.durationMs}ms</TableCell>
                  <TableCell>
                    {row.actorUserId ? `#${row.actorUserId}` : "N/A"}
                  </TableCell>
                  <TableCell>{row.errorCategory}</TableCell>
                  <TableCell>
                    {row.publicError ?? row.errorCode ?? "-"}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </section>

      <section class="tw-record-index-panel space-y-3 p-4">
        <h2 class="text-base font-semibold">Transiciones de auditoria</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Cambios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={auditSnapshot().events}>
              {(row) => (
                <TableRow>
                  <TableCell>
                    {new Date(row.createdAt).toLocaleTimeString("es-PE")}
                  </TableCell>
                  <TableCell class="font-medium">{row.action}</TableCell>
                  <TableCell>
                    {row.entityType}#{row.entityId}
                  </TableCell>
                  <TableCell>#{row.userId}</TableCell>
                  <TableCell>{row.changes ?? "-"}</TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </section>

      <section class="tw-record-index-panel space-y-3 p-4">
        <h2 class="text-base font-semibold">
          Politicas de riesgo de auditoria
        </h2>
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-52">
            <Input
              label="Accion"
              value={policyAction()}
              onInput={(event) => setPolicyAction(event.currentTarget.value)}
              placeholder="leads_requested"
              class="h-10"
            />
          </div>
          <div class="w-36">
            <Select
              label="Riesgo"
              value={policyRiskLevel()}
              onInput={(event) =>
                setPolicyRiskLevel(parseRiskLevel(event.currentTarget.value))
              }
              class="h-10"
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </Select>
          </div>
          <Checkbox
            label="Activa"
            checked={policyIsActive()}
            onInput={(event) => setPolicyIsActive(event.currentTarget.checked)}
            class="mt-1"
          />
          <Button
            disabled={!canManagePolicies()}
            onClick={() => {
              void savePolicy();
            }}
          >
            Guardar politica
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Acciones sin politica explicita se tratan como riesgo high para evitar
          ocultar eventos criticos.
        </p>
        <p class="text-xs text-muted-foreground">
          Solo admin y superuser pueden editar politicas.
        </p>
        <p class="text-xs text-destructive">{policyError() ?? ""}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accion</TableHead>
              <TableHead>Riesgo</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead>Protegida</TableHead>
              <TableHead>Actualizada por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={policySnapshot().items}>
              {(item) => (
                <TableRow>
                  <TableCell class="font-medium">{item.action}</TableCell>
                  <TableCell>{item.riskLevel}</TableCell>
                  <TableCell>{item.isActive ? "si" : "no"}</TableCell>
                  <TableCell>{item.isProtected ? "si" : "no"}</TableCell>
                  <TableCell>
                    {item.updatedByUserId ? `#${item.updatedByUserId}` : "-"}
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </section>
    </AppPage>
  );
}
