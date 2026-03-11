import { A, createAsync, useAction } from "@solidjs/router";
import { For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { requestSalesExportMutation } from "~/lib/mutations/sales-exports";
import { salesExportJobsQuery } from "~/lib/queries/sales-exports";
import { formatDate } from "~/lib/utils";

import styles from "./exports-page.module.css";

export default function SalesExportsPage() {
  const jobs = createAsync(() => salesExportJobsQuery(), {
    initialValue: [],
  });
  const requestExport = useAction(requestSalesExportMutation);

  async function handleRequestExport(format: "csv" | "xlsx") {
    await requestExport(format);
  }

  return (
    <AppPage>
      <div class={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            void handleRequestExport("csv");
          }}
        >
          Solicitar CSV
        </Button>
        <Button
          onClick={() => {
            void handleRequestExport("xlsx");
          }}
        >
          Solicitar Excel
        </Button>
      </div>

      <Show
        when={jobs().length > 0}
        fallback={
          <p class={styles.empty}>Aún no hay exportaciones solicitadas.</p>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Filas</TableHead>
              <TableHead>Solicitado por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={jobs()}>
              {(job) => (
                <TableRow>
                  <TableCell>#{job.id}</TableCell>
                  <TableCell>{job.format.toUpperCase()}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{job.rowsCount ?? "—"}</TableCell>
                  <TableCell>{job.requestedByName}</TableCell>
                  <TableCell>{formatDate(job.requestedAt)}</TableCell>
                  <TableCell>
                    <A href={`/sales/reports/exports/${job.id}`}>Abrir</A>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </AppPage>
  );
}
