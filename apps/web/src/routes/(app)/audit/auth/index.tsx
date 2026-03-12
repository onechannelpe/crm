import { createAsync, revalidate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { WindowSelect } from "~/components/features/audit/window-select";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { authFunnelSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";

type BadgeVariant = "success" | "destructive" | "outline";

function outcomeBadgeVariant(outcome: string): BadgeVariant {
  const o = outcome.toLowerCase();
  if (o.includes("success") || o.includes("ok")) return "success";
  if (o.includes("fail") || o.includes("error")) return "destructive";
  return "outline";
}

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
      <FilterBar>
        <WindowSelect value={windowMinutes()} onInput={setWindowMinutes} />
        <Button
          onClick={() => {
            void revalidate(authFunnelSnapshotQuery.key);
          }}
        >
          Recargar
        </Button>
      </FilterBar>

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
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>{row.eventName}</TableCell>
                <TableCell>{row.screen ?? "—"}</TableCell>
                <TableCell>{row.method ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={outcomeBadgeVariant(row.outcome)}>
                    {row.outcome}
                  </Badge>
                </TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.routePath ?? "—"}</TableCell>
                <TableCell>{row.code ?? "—"}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </AppPage>
  );
}
