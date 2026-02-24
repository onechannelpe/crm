import { useParams } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";

import {
  getSalesExportJob,
  listSalesExportDownloads,
  recordSalesExportDownload,
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

export default function SalesExportDetailPage() {
  const params = useParams();
  const jobId = () => Number(params.jobId);

  const [job] = createResource(jobId, async (id) => getSalesExportJob(id));
  const [downloads, { refetch: refetchDownloads }] = createResource(
    jobId,
    async (id) => listSalesExportDownloads(id),
    { initialValue: [] },
  );

  async function handleRecordDownload() {
    await recordSalesExportDownload(jobId());
    await refetchDownloads();
  }

  return (
    <AppPage>
      <Show
        when={job()}
        fallback={
          <p style={{ color: "var(--color-text-muted)" }}>Export not found.</p>
        }
      >
        {(currentJob) => (
          <>
            <h2 style={{ margin: "0 0 12px 0" }}>Export #{currentJob().id}</h2>
            <p style={{ margin: "0 0 6px 0" }}>
              Format: {currentJob().format.toUpperCase()}
            </p>
            <p style={{ margin: "0 0 6px 0" }}>Status: {currentJob().status}</p>
            <p style={{ margin: "0 0 12px 0" }}>
              Rows: {currentJob().rowsCount ?? "—"}
            </p>
            <Button
              onClick={() => {
                void handleRecordDownload();
              }}
            >
              Record download
            </Button>

            <h3 style={{ margin: "20px 0 8px 0" }}>Download audit</h3>
            <Show
              when={downloads().length > 0}
              fallback={
                <p style={{ color: "var(--color-text-muted)" }}>
                  No download events yet.
                </p>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Downloaded at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={downloads()}>
                    {(download) => (
                      <TableRow>
                        <TableCell>#{download.id}</TableCell>
                        <TableCell>{download.downloadedByName}</TableCell>
                        <TableCell>
                          {formatDate(download.downloadedAt)}
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </Show>
          </>
        )}
      </Show>
    </AppPage>
  );
}
