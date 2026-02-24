import { useParams } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";

import {
  getSalesExportJob,
  listSalesExportDownloads,
} from "~/actions/sales-exports";
import { useToast } from "~/components/feedback/toast-provider";
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
import { getErrorMessage } from "~/lib/errors";
import { formatDate } from "~/lib/utils";

import styles from "./export-detail-page.module.css";

export default function SalesExportDetailPage() {
  const params = useParams();
  const jobId = () => Number(params.jobId);
  const { showToast } = useToast();

  const [job] = createResource(jobId, async (id) => getSalesExportJob(id));
  const [downloads, { refetch: refetchDownloads }] = createResource(
    jobId,
    async (id) => listSalesExportDownloads(id),
    { initialValue: [] },
  );

  async function handleDownload() {
    try {
      const response = await fetch(
        `/api/sales/reports/exports/${jobId()}/download`,
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Download failed");
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `sales-export-${jobId()}.bin`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      await refetchDownloads();
      showToast("success", "Export downloaded");
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "Download failed"));
    }
  }

  return (
    <AppPage>
      <Show
        when={job()}
        fallback={<p class={styles.emptyText}>Export not found.</p>}
      >
        {(currentJob) => (
          <>
            <h2 class={styles.title}>Export #{currentJob().id}</h2>
            <p class={styles.meta}>
              Format: {currentJob().format.toUpperCase()}
            </p>
            <p class={styles.meta}>Status: {currentJob().status}</p>
            <p class={styles.metaLast}>Rows: {currentJob().rowsCount ?? "—"}</p>
            <Button
              disabled={currentJob().status !== "completed"}
              onClick={() => {
                void handleDownload();
              }}
            >
              Download export
            </Button>

            <h3 class={styles.auditTitle}>Download audit</h3>
            <Show
              when={downloads().length > 0}
              fallback={<p class={styles.emptyText}>No download events yet.</p>}
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
