import { createSignal, For, Show } from "solid-js";

import { getUserLoginRetryReport } from "~/actions/admin-auth-security";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { getErrorMessage } from "~/lib/errors";

import styles from "./login-retries-card.module.css";

function formatDate(value: number): string {
  return new Date(value).toLocaleString();
}

function labelFor(stage: string): string {
  if (stage === "challenge") return "Passkey challenge";
  if (stage === "verify") return "Passkey verify";
  return "Password login";
}

export function LoginRetriesCard() {
  const [email, setEmail] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [report, setReport] =
    createSignal<Awaited<ReturnType<typeof getUserLoginRetryReport>>>(null);
  const { showToast } = useToast();

  const lookup = async () => {
    setLoading(true);
    try {
      const next = await getUserLoginRetryReport(email());
      setReport(next);
      if (!next) showToast("info", "User not found");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Lookup failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class={styles.root}>
      <h2 class={styles.title}>Login security</h2>
      <p class={styles.description}>Inspect user login retries.</p>
      <form
        class={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <Input
          type="email"
          label="User email"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <Button type="submit" disabled={loading()}>
          {loading() ? "Loading..." : "View retries"}
        </Button>
      </form>

      <Show when={report()}>
        {(data) => (
          <div class={styles.report}>
            <p class={styles.user}>
              {data().user.fullName} ({data().user.email})
            </p>
            <div class={styles.stats}>
              <div class={styles.statCard}>
                <p class={styles.statLabel}>retries in 15m</p>
                <p class={styles.statValue}>{data().retryCount15m}</p>
              </div>
              <div class={styles.statCard}>
                <p class={styles.statLabel}>retries in 24h</p>
                <p class={styles.statValue}>{data().retryCount24h}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={data().recentRetries}>
                  {(event) => (
                    <TableRow>
                      <TableCell>{formatDate(event.created_at)}</TableCell>
                      <TableCell>{labelFor(event.stage)}</TableCell>
                      <TableCell>{event.outcome}</TableCell>
                      <TableCell>{event.reason ?? "-"}</TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </div>
        )}
      </Show>
    </section>
  );
}
