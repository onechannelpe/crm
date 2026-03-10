import { createAsync, revalidate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { observabilitySnapshotQuery } from "~/lib/queries/audit";

import styles from "../audit-page.module.css";

const WINDOW_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hora" },
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
] as const;

function parseStatus(value: string): "all" | "ok" | "error" {
  if (value === "ok" || value === "error") return value;
  return "all";
}

export default function AuditObservabilityPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);
  const [status, setStatus] = createSignal<"all" | "ok" | "error">("all");

  const snapshot = createAsync(
    () =>
      observabilitySnapshotQuery({
        windowMinutes: windowMinutes(),
        status: status() === "all" ? undefined : status(),
        limit: 80,
      }),
    { initialValue: { windowMinutes: 60, summary: [], recent: [] } },
  );

  return (
    <AppPage>
      <div class={styles.auditGrid}>
        <div class={styles.filterRow}>
          <div class={styles.fieldW44}>
            <Select
              label="Ventana"
              value={windowMinutes()}
              onInput={(e) => setWindowMinutes(Number(e.currentTarget.value))}
            >
              <For each={WINDOW_OPTIONS}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </Select>
          </div>
          <div class={styles.fieldW40}>
            <Select
              label="Estado"
              value={status()}
              onInput={(e) => setStatus(parseStatus(e.currentTarget.value))}
            >
              <option value="all">Todos</option>
              <option value="ok">OK</option>
              <option value="error">Errores</option>
            </Select>
          </div>
          <Button
            onClick={() => {
              void revalidate(observabilitySnapshotQuery.key);
            }}
          >
            Recargar
          </Button>
        </div>

        <section class={styles.section}>
          <h2 class={styles.title}>Resumen por acción</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acción</TableHead>
                <TableHead>Ejecuciones</TableHead>
                <TableHead>Errores</TableHead>
                <TableHead>Promedio (ms)</TableHead>
                <TableHead>Máximo (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={snapshot().summary}>
                {(row) => (
                  <TableRow>
                    <TableCell class={styles.strong}>
                      {row.actionName}
                    </TableCell>
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

        <section class={styles.section}>
          <h2 class={styles.title}>Eventos recientes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Categoría</TableHead>
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
                    <TableCell class={styles.strong}>
                      {row.actionName}
                    </TableCell>
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
      </div>
    </AppPage>
  );
}
