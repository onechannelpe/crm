import { createAsync, revalidate } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { AppPage } from "~/components/layout/page";
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
import { auditReaderSnapshotQuery } from "~/lib/queries/audit";

import styles from "../audit-page.module.css";

const AUDIT_WINDOW_OPTIONS = [
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
  { value: 10080, label: "7 días" },
  { value: 43200, label: "30 días" },
] as const;

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
      <div class={styles.auditGrid}>
        <div class={styles.filterRow}>
          <div class={styles.fieldW44}>
            <Select
              label="Ventana"
              value={windowMinutes()}
              onInput={(e) => setWindowMinutes(Number(e.currentTarget.value))}
            >
              <For each={AUDIT_WINDOW_OPTIONS}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </Select>
          </div>
          <div class={styles.fieldW52}>
            <Input
              label="Acción"
              value={actionFilter()}
              onInput={(e) => setActionFilter(e.currentTarget.value)}
              placeholder="sales_record_confirmed"
            />
          </div>
          <div class={styles.fieldW44}>
            <Input
              label="Entidad"
              value={entityTypeFilter()}
              onInput={(e) => setEntityTypeFilter(e.currentTarget.value)}
              placeholder="sales_record"
            />
          </div>
          <div class={styles.fieldW28}>
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
        </div>

        <section class={styles.section}>
          <h2 class={styles.title}>Transiciones de auditoría</h2>
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
                    <TableCell>
                      {new Date(row.createdAt).toLocaleTimeString("es-PE")}
                    </TableCell>
                    <TableCell class={styles.strong}>{row.action}</TableCell>
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
      </div>
    </AppPage>
  );
}
