import { createResource, createSignal, For, Show } from "solid-js";

import {
  confirmSalesRecord,
  listPendingSalesRecords,
  rejectSalesRecord,
} from "~/actions/sales-records";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
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
import { runOptimistic } from "~/lib/ui/run-optimistic";
import { formatDate } from "~/lib/utils";

import styles from "./confirmations-page.module.css";

export default function SalesConfirmationsPage() {
  const [notes, { mutate, refetch }] = createResource(
    () => true,
    async () => listPendingSalesRecords(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentNotes = () => notes.latest ?? [];
  const [rejectingNoteId, setRejectingNoteId] = createSignal<number | null>(
    null,
  );
  const { showToast } = useToast();

  const handleApprove = async (noteId: number) => {
    try {
      await runOptimistic({
        read: currentNotes,
        write: (next) => mutate(() => next),
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          await confirmSalesRecord(noteId);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", `Sale #${noteId} confirmed`);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Approval failed"));
    }
  };

  const handleReject = async (
    noteId: number,
    rejections: Array<{ fieldId: string; note: string }>,
  ) => {
    try {
      await runOptimistic({
        read: currentNotes,
        write: (next) => mutate(() => next),
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          const reason = rejections
            .map((it) => `${it.fieldId}: ${it.note}`)
            .join(" | ");
          await rejectSalesRecord(noteId, reason);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", `Sale #${noteId} rejected`);
      setRejectingNoteId(null);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Rejection failed"));
    }
  };

  return (
    <AppPage>
      <Show
        when={currentNotes().length > 0}
        fallback={
          <EmptyState
            title="No sales pending confirmation"
            description="Submitted sales will appear here."
          />
        }
      >
        <Show when={rejectingNoteId()}>
          {(id) => (
            <section class={styles.rejectPanel}>
              <h2 class={styles.rejectTitle}>Reject sale #{id()}</h2>
              <RejectionForm
                onReject={(rejections) => handleReject(id(), rejections)}
                onCancel={() => setRejectingNoteId(null)}
              />
            </section>
          )}
        </Show>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead class={styles.actionsHead}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={currentNotes()}>
              {(note) => (
                <TableRow>
                  <TableCell class={styles.idCell}>#{note.id}</TableCell>
                  <TableCell>
                    <div class={styles.contactWrap}>
                      <p class={styles.contactName}>{note.contactName}</p>
                      <p class={styles.contactMeta}>{note.contactDni}</p>
                    </div>
                  </TableCell>
                  <TableCell>{note.executiveName}</TableCell>
                  <TableCell class={styles.dateCell}>
                    {formatDate(note.createdAt)}
                  </TableCell>
                  <TableCell class={styles.actionsCell}>
                    <div class={styles.actions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void handleApprove(note.id);
                        }}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectingNoteId(note.id)}
                      >
                        Reject
                      </Button>
                    </div>
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
