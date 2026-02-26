import { createSignal, For, Show } from "solid-js";

import {
  confirmSalesRecord,
  registerSalesRecordAttempt,
  rejectSalesRecord,
} from "~/actions/sales-records";
import { RejectionForm } from "~/components/features/sales/rejection-form";
import { EmptyState } from "~/components/feedback/empty-state";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { Textarea } from "~/components/ui/input/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { getErrorMessage } from "~/lib/errors";
import { pendingSalesRecordsQuery } from "~/lib/queries/sales-records";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";
import { formatDate } from "~/lib/utils";

import styles from "./confirmations-page.module.css";

const ATTEMPT_OUTCOMES = [
  { value: "no_answer", label: "No answer" },
  { value: "callback_scheduled", label: "Callback scheduled" },
  { value: "validated", label: "Validated" },
  { value: "invalid_data", label: "Invalid data" },
  { value: "rejected", label: "Rejected" },
] as const;

function isAttemptOutcome(
  value: string,
): value is (typeof ATTEMPT_OUTCOMES)[number]["value"] {
  return ATTEMPT_OUTCOMES.some((outcome) => outcome.value === value);
}

export default function SalesConfirmationsPage() {
  const {
    data: currentNotes,
    write: writeNotes,
    revalidate: revalidateNotes,
  } = createOptimisticQuery(() => pendingSalesRecordsQuery(), {
    initialValue: [],
    key: pendingSalesRecordsQuery.key,
  });
  const [rejectingNoteId, setRejectingNoteId] = createSignal<number | null>(
    null,
  );
  const [attemptingNoteId, setAttemptingNoteId] = createSignal<number | null>(
    null,
  );
  const [attemptOutcome, setAttemptOutcome] =
    createSignal<(typeof ATTEMPT_OUTCOMES)[number]["value"]>("no_answer");
  const [attemptNotes, setAttemptNotes] = createSignal("");
  const [nextAttemptAt, setNextAttemptAt] = createSignal("");
  const { showToast } = useToast();

  const handleApprove = async (noteId: number) => {
    try {
      await runOptimistic({
        read: currentNotes,
        write: writeNotes,
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          await confirmSalesRecord(noteId);
        },
        reconcile: revalidateNotes,
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
        write: writeNotes,
        optimistic: (prev) => prev.filter((note) => note.id !== noteId),
        commit: async () => {
          const reason = rejections
            .map((it) => `${it.fieldId}: ${it.note}`)
            .join(" | ");
          await rejectSalesRecord(noteId, reason);
        },
        reconcile: revalidateNotes,
      });
      showToast("success", `Sale #${noteId} rejected`);
      setRejectingNoteId(null);
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Rejection failed"));
    }
  };

  const resetAttemptState = () => {
    setAttemptingNoteId(null);
    setAttemptOutcome("no_answer");
    setAttemptNotes("");
    setNextAttemptAt("");
  };

  const handleAttempt = async (noteId: number) => {
    try {
      const nextAttemptAtValue = nextAttemptAt().trim();
      const parsedNextAttemptAt =
        nextAttemptAtValue.length > 0 ? Date.parse(nextAttemptAtValue) : null;
      if (
        nextAttemptAtValue.length > 0 &&
        (Number.isNaN(parsedNextAttemptAt) || parsedNextAttemptAt === null)
      ) {
        showToast("error", "Next attempt date is invalid");
        return;
      }

      await registerSalesRecordAttempt(
        noteId,
        attemptOutcome(),
        attemptNotes().trim() || null,
        parsedNextAttemptAt,
      );
      showToast("success", `Attempt logged for sale #${noteId}`);
      await revalidateNotes();
      resetAttemptState();
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Attempt logging failed"));
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
        <Show when={attemptingNoteId()}>
          {(id) => (
            <section class={styles.attemptPanel}>
              <h2 class={styles.attemptTitle}>Log attempt for sale #{id()}</h2>
              <div class={styles.attemptFields}>
                <Select
                  value={attemptOutcome()}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    if (isAttemptOutcome(value)) setAttemptOutcome(value);
                  }}
                >
                  <For each={ATTEMPT_OUTCOMES}>
                    {(outcome) => (
                      <option value={outcome.value}>{outcome.label}</option>
                    )}
                  </For>
                </Select>
                <Input
                  type="datetime-local"
                  label="Next attempt at (optional)"
                  value={nextAttemptAt()}
                  onInput={(e) => setNextAttemptAt(e.currentTarget.value)}
                />
                <Textarea
                  label="Notes (optional)"
                  value={attemptNotes()}
                  onInput={(e) => setAttemptNotes(e.currentTarget.value)}
                  rows={3}
                />
                <div class={styles.attemptActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resetAttemptState()}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleAttempt(id());
                    }}
                  >
                    Save attempt
                  </Button>
                </div>
              </div>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAttemptingNoteId(note.id);
                        }}
                      >
                        Log attempt
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
