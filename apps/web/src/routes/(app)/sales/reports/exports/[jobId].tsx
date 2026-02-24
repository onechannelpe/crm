import { useParams } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";

import {
  downloadSalesExportFile,
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

  const [job] = createResource(jobId, async (id) => getSalesExportJob(id));
  const [downloads, { refetch: refetchDownloads }] = createResource(
    jobId,
    async (id) => listSalesExportDownloads(id),
    { initialValue: [] },
  );

  async function handleDownload() {
    try {
      const payload = await downloadSalesExportFile(jobId());
      const dataUrl = `data:${payload.mimeType};base64,${payload.base64Content}`;
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = payload.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
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
const { showToast } = useToast();
