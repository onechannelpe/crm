import { createSignal, For } from "solid-js";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
  upsertAuditPolicy,
} from "~/actions/admin-audit-policy";
import { getAuditReaderSnapshot } from "~/actions/admin-audit-reader";
import { getObservabilitySnapshot } from "~/actions/admin-observability";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { createAppQuery } from "~/lib/ui/create-app-query";

const WINDOW_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hora" },
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
] as const;

const AUDIT_WINDOW_OPTIONS = [
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
  { value: 10080, label: "7 dias" },
  { value: 43200, label: "30 dias" },
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
      setPolicyError(
        "No se pudo guardar la politica. Verifica permisos y valores.",
      );
    }
  }

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Observabilidad</h1>
        <p class="mt-1 text-sm text-gray-500">
          Tiempos, errores y volumen de ejecucion de acciones del CRM.
        </p>
      </div>

      <Card class="p-4 flex flex-wrap gap-3 items-end">
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Ventana</span>
          <select
            value={windowMinutes()}
            onInput={(event) =>
              setWindowMinutes(Number(event.currentTarget.value))
            }
            class="h-10 rounded-md border px-3 text-sm"
          >
            <For each={WINDOW_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Estado</span>
          <select
            value={status()}
            onInput={(event) =>
              setStatus(parseStatus(event.currentTarget.value))
            }
            class="h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="ok">OK</option>
            <option value="error">Errores</option>
          </select>
        </label>
        <Button
          onClick={() => {
            void refetch();
          }}
        >
          Actualizar
        </Button>
      </Card>

      <Card class="p-4 flex flex-wrap gap-3 items-end">
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Ventana auditoria</span>
          <select
            value={auditWindowMinutes()}
            onInput={(event) =>
              setAuditWindowMinutes(Number(event.currentTarget.value))
            }
            class="h-10 rounded-md border px-3 text-sm"
          >
            <For each={AUDIT_WINDOW_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </label>
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Accion</span>
          <input
            value={actionFilter()}
            onInput={(event) => setActionFilter(event.currentTarget.value)}
            placeholder="charge_note_approved"
            class="h-10 rounded-md border px-3 text-sm"
          />
        </label>
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Entidad</span>
          <input
            value={entityTypeFilter()}
            onInput={(event) => setEntityTypeFilter(event.currentTarget.value)}
            placeholder="charge_note"
            class="h-10 rounded-md border px-3 text-sm"
          />
        </label>
        <label class="space-y-2 block">
          <span class="text-sm font-medium">Actor #</span>
          <input
            value={actorUserIdFilter()}
            onInput={(event) => setActorUserIdFilter(event.currentTarget.value)}
            placeholder="5"
            class="h-10 rounded-md border px-3 text-sm"
          />
        </label>
        <label class="flex items-center gap-2 h-10 px-2 text-sm">
          <input
            type="checkbox"
            checked={onlyHighRisk()}
            onInput={(event) => setOnlyHighRisk(event.currentTarget.checked)}
          />
          Solo alto riesgo
        </label>
        <Button
          onClick={() => {
            void refetchAuditSnapshot();
          }}
        >
          Actualizar auditoria
        </Button>
      </Card>

      <Card class="p-4 space-y-3">
        <h2 class="text-base font-semibold">Resumen por accion</h2>
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
      </Card>

      <Card class="p-4 space-y-3">
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
      </Card>

      <Card class="p-4 space-y-3">
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
      </Card>

      <Card class="p-4 space-y-3">
        <h2 class="text-base font-semibold">
          Politicas de riesgo de auditoria
        </h2>
        <div class="flex flex-wrap gap-3 items-end">
          <label class="space-y-2 block">
            <span class="text-sm font-medium">Accion</span>
            <input
              value={policyAction()}
              onInput={(event) => setPolicyAction(event.currentTarget.value)}
              placeholder="leads_requested"
              class="h-10 rounded-md border px-3 text-sm"
            />
          </label>
          <label class="space-y-2 block">
            <span class="text-sm font-medium">Riesgo</span>
            <select
              value={policyRiskLevel()}
              onInput={(event) =>
                setPolicyRiskLevel(parseRiskLevel(event.currentTarget.value))
              }
              class="h-10 rounded-md border px-3 text-sm"
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
          <label class="flex items-center gap-2 h-10 px-2 text-sm">
            <input
              type="checkbox"
              checked={policyIsActive()}
              onInput={(event) =>
                setPolicyIsActive(event.currentTarget.checked)
              }
            />
            Activa
          </label>
          <Button
            disabled={!canManagePolicies()}
            onClick={() => {
              void savePolicy();
            }}
          >
            Guardar politica
          </Button>
        </div>
        <p class="text-xs text-gray-500">
          Acciones sin politica explicita se tratan como riesgo high para evitar
          ocultar eventos criticos.
        </p>
        <p class="text-xs text-gray-500">
          Solo admin y superuser pueden editar politicas.
        </p>
        <p class="text-xs text-red-600">{policyError() ?? ""}</p>
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
      </Card>
    </div>
  );
}
