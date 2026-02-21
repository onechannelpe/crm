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
    <section class="space-y-4">
      <h2 class="text-base font-semibold text-foreground">Login security</h2>
      <p class="text-sm text-muted-foreground">Inspect user login retries.</p>
      <form
        class="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 items-end"
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
          <div class="space-y-3">
            <p class="text-sm text-foreground">
              {data().user.fullName} ({data().user.email})
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="border border-border px-3 py-2">
                <p class="text-xs text-muted-foreground">retries in 15m</p>
                <p class="text-2xl font-semibold">{data().retryCount15m}</p>
              </div>
              <div class="border border-border px-3 py-2">
                <p class="text-xs text-muted-foreground">retries in 24h</p>
                <p class="text-2xl font-semibold">{data().retryCount24h}</p>
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
