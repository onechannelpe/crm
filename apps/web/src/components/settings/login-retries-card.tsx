import { createSignal, For, Show } from "solid-js";

import { getUserLoginRetryReport } from "~/actions/admin-auth-security";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Card } from "~/components/ui/layout/card";
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
      if (!next) showToast("info", "Usuario no encontrado");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "No se pudo consultar"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card class="p-6 space-y-4">
      <h2 class="text-base font-semibold text-foreground">
        Seguridad de acceso
      </h2>
      <p class="text-sm text-muted-foreground">
        Consulta reintentos de login por usuario.
      </p>
      <form
        class="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <Input
          type="email"
          label="Correo del usuario"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <Button type="submit" disabled={loading()}>
          {loading() ? "Consultando..." : "Ver reintentos"}
        </Button>
      </form>

      <Show when={report()}>
        {(data) => (
          <div class="space-y-3">
            <p class="text-sm text-foreground">
              {data().user.fullName} ({data().user.email})
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card class="p-3">
                <p class="text-xs text-muted-foreground">reintentos en 15m</p>
                <p class="text-2xl font-semibold">{data().retryCount15m}</p>
              </Card>
              <Card class="p-3">
                <p class="text-xs text-muted-foreground">reintentos en 24h</p>
                <p class="text-2xl font-semibold">{data().retryCount24h}</p>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Motivo</TableHead>
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
    </Card>
  );
}
