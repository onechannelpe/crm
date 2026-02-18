import { createSignal, For } from "solid-js";

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

function parseStatus(value: string): "all" | "ok" | "error" {
  if (value === "ok" || value === "error") {
    return value;
  }
  return "all";
}

export default function AuditObservabilityPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);
  const [status, setStatus] = createSignal<"all" | "ok" | "error">("all");
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
                  <TableCell>{row.errorCode ?? "-"}</TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
