import { useParams } from "@solidjs/router";
import { createMemo, createResource, Show } from "solid-js";

import {
  getSalesExportJob,
  listSalesExportDownloads,
} from "~/actions/sales-exports";
import { useToast } from "~/components/feedback/toast-provider";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { getErrorMessage } from "~/lib/errors";
import { formatDate } from "~/lib/utils";

import styles from "./export-detail-page.module.css";

type SalesExportDownloadRow = Awaited<
  ReturnType<typeof listSalesExportDownloads>
>[number];

const SALES_EXPORT_DOWNLOAD_COLUMNS = [
  {
    key: "id",
    label: "ID",
    icon: CircleQuestionMark,
    width: 90,
    sticky: true,
    renderCell: (download) => `#${download.id}`,
  },
  {
    key: "downloadedByName",
    label: "User",
    icon: UserRound,
    minWidth: 220,
    grow: true,
    renderCell: (download) => download.downloadedByName,
  },
  {
    key: "downloadedAt",
    label: "Downloaded at",
    icon: CalendarDays,
    width: 180,
    renderCell: (download) => formatDate(download.downloadedAt),
  },
] satisfies ReadonlyArray<DataGridColumn<SalesExportDownloadRow>>;

export default function SalesExportDetailPage() {
  const params = useParams();
  const jobId = () => Number(params.jobId);
  const { showToast } = useToast();

  const [job] = createResource(jobId, async (id) => getSalesExportJob(id));
  const [downloads, { refetch: refetchDownloads }] = createResource(
    jobId,
    async (id) => listSalesExportDownloads(id),
  );
  const downloadRows = createMemo(() => downloads() ?? []);

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
            <p class={styles.metaLast}>Rows: {currentJob().rowsCount ?? "-"}</p>
            <Button
              disabled={currentJob().status !== "completed"}
              onClick={() => {
                void handleDownload();
              }}
            >
              Download export
            </Button>

            <h3 class={styles.auditTitle}>Download audit</h3>
            <DataGrid
              ariaLabel="Download audit"
              columns={[...SALES_EXPORT_DOWNLOAD_COLUMNS]}
              emptyState={
                <p class={styles.emptyText}>No download events yet.</p>
              }
              isLoading={downloads.loading && downloads() === undefined}
              rowOpen={createNoopRowOpen()}
              rows={downloadRows()}
            />
          </>
        )}
      </Show>
    </AppPage>
  );
}
