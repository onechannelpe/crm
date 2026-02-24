import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";

import {
  listSalesExportJobs,
  requestSalesExport,
} from "~/actions/sales-exports";
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
import { formatDate } from "~/lib/utils";

export default function SalesExportsPage() {
  const [jobs, { refetch: refetchJobs }] = createResource(
    () => true,
    async () => listSalesExportJobs(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );

  async function handleRequestExport(format: "csv" | "xlsx") {
    await requestSalesExport(format);
    await refetchJobs();
  }

  return (
    <AppPage>
      <div
        style={{ display: "flex", "justify-content": "flex-end", gap: "8px" }}
      >
        <Button
          variant="secondary"
          onClick={() => {
            void handleRequestExport("csv");
          }}
        >
          Request CSV
        </Button>
        <Button
          onClick={() => {
            void handleRequestExport("xlsx");
          }}
        >
          Request Excel
        </Button>
      </div>

      <Show
        when={jobs().length > 0}
        fallback={
          <p style={{ margin: "16px 0", color: "var(--color-text-muted)" }}>
            No exports requested yet.
          </p>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Requested at</TableHead>
              <TableHead>Detail</TableHead>
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
                    <A href={`/sales/reports/exports/${job.id}`}>Open</A>
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
