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
import { authFunnelSnapshotQuery } from "~/lib/queries/audit";

import styles from "../audit-page.module.css";

const WINDOW_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hora" },
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
] as const;

export default function AuditAuthPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);

  const snapshot = createAsync(
    () =>
      authFunnelSnapshotQuery({
        windowMinutes: windowMinutes(),
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
          <Button
            onClick={() => {
              void revalidate(authFunnelSnapshotQuery.key);
            }}
          >
            Recargar
          </Button>
        </div>

        <section class={styles.section}>
          <h2 class={styles.title}>Embudo de autenticación</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Pantalla</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Conteo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={snapshot().summary}>
                {(row) => (
                  <TableRow>
                    <TableCell class={styles.strong}>{row.eventName}</TableCell>
                    <TableCell>{row.screen ?? "N/A"}</TableCell>
                    <TableCell>{row.method ?? "N/A"}</TableCell>
                    <TableCell>{row.outcome}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </section>

        <section class={styles.section}>
          <h2 class={styles.title}>Eventos recientes de autenticación</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Pantalla</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Código</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={snapshot().recent}>
                {(row) => (
                  <TableRow>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleTimeString("es-PE")}
                    </TableCell>
                    <TableCell class={styles.strong}>{row.eventName}</TableCell>
                    <TableCell>{row.screen ?? "N/A"}</TableCell>
                    <TableCell>{row.method ?? "N/A"}</TableCell>
                    <TableCell>{row.outcome}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell>{row.routePath ?? "N/A"}</TableCell>
                    <TableCell>{row.code ?? "-"}</TableCell>
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
