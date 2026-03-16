import { createAsync, revalidate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { WindowSelect } from "~/components/features/audit/window-select";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
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
import { observabilitySnapshotQuery } from "~/lib/queries/audit";

function parseStatus(value: string): "all" | "ok" | "error" {
  if (value === "ok" || value === "error") return value;
  return "all";
}

export default function MonitoringPage() {
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
      <FilterBar>
        <WindowSelect value={windowMinutes()} onInput={setWindowMinutes} />
        <div style={{ width: "10rem" }}>
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
      </FilterBar>

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
                <TableCell>{row.actionName}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{row.errorCount}</TableCell>
                <TableCell>{Math.round(row.avgDurationMs)}</TableCell>
                <TableCell>{Math.round(row.maxDurationMs)}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </AppPage>
  );
}
