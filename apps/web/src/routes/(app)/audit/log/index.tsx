import { createAsync, revalidate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import {
  WINDOW_OPTIONS_EXTENDED,
  WindowSelect,
} from "~/components/features/audit/window-select";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { auditReaderSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";

function parseActorUserId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export default function AuditLogPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(1440);
  const [onlyHighRisk, setOnlyHighRisk] = createSignal(true);
  const [actionFilter, setActionFilter] = createSignal("");
  const [entityTypeFilter, setEntityTypeFilter] = createSignal("");
  const [actorUserIdFilter, setActorUserIdFilter] = createSignal("");

  const snapshot = createAsync(
    () =>
      auditReaderSnapshotQuery({
        windowMinutes: windowMinutes(),
        limit: 80,
        onlyHighRisk: onlyHighRisk(),
        action: actionFilter().trim() || undefined,
        entityType: entityTypeFilter().trim() || undefined,
        actorUserId: parseActorUserId(actorUserIdFilter()),
      }),
    { initialValue: { windowMinutes: 1440, events: [] } },
  );

  return (
    <AppPage>
      <FilterBar>
        <WindowSelect
          value={windowMinutes()}
          onInput={setWindowMinutes}
          options={WINDOW_OPTIONS_EXTENDED}
        />
        <div style={{ width: "13rem" }}>
          <Input
            label="Acción"
            value={actionFilter()}
            onInput={(e) => setActionFilter(e.currentTarget.value)}
            placeholder="sales_record_confirmed"
          />
        </div>
        <div style={{ width: "11rem" }}>
          <Input
            label="Entidad"
            value={entityTypeFilter()}
            onInput={(e) => setEntityTypeFilter(e.currentTarget.value)}
            placeholder="sales_record"
          />
        </div>
        <div style={{ width: "7rem" }}>
          <Input
            label="Actor #"
            value={actorUserIdFilter()}
            onInput={(e) => setActorUserIdFilter(e.currentTarget.value)}
            placeholder="5"
          />
        </div>
        <Checkbox
          label="Solo riesgo alto"
          checked={onlyHighRisk()}
          onInput={(e) => setOnlyHighRisk(e.currentTarget.checked)}
        />
        <Button
          onClick={() => {
            void revalidate(auditReaderSnapshotQuery.key);
          }}
        >
          Recargar
        </Button>
      </FilterBar>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hora</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Cambios</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={snapshot().events}>
            {(row) => (
              <TableRow>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>
                  {row.entityType}#{row.entityId}
                </TableCell>
                <TableCell>#{row.userId}</TableCell>
                <TableCell>{row.changes ?? "—"}</TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </AppPage>
  );
}
