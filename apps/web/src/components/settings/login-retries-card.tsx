import { useAction, useSubmission } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
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
import { actionErrorMessage } from "~/contracts/errors";
import { formatAppDateTime } from "~/domain/time/app-time";
import { loginRetryReportMutation } from "~/features/auth/data/security-mutations";

import styles from "./login-retries-card.module.css";

function labelFor(stage: string): string {
  if (stage === "challenge") return "Desafío de clave de acceso";
  if (stage === "verify") return "Verificación de clave de acceso";
  return "Inicio de sesión con contraseña";
}

export function LoginRetriesCard() {
  const [email, setEmail] = createSignal("");
  const { enqueueErrorSnackBar, enqueueInfoSnackBar } = useSnackBar();
  const lookup = useAction(loginRetryReportMutation);
  const submission = useSubmission(loginRetryReportMutation);
  const report = () => submission.result;

  async function handleLookup(): Promise<void> {
    try {
      const next = await lookup(email());
      if (!next) enqueueInfoSnackBar("Usuario no encontrado");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <section class={styles.root}>
      <form
        class={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void handleLookup();
        }}
      >
        <Input
          type="email"
          label="Correo del usuario"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <Button
          type="submit"
          loading={Boolean(submission.pending)}
          disabled={Boolean(submission.pending)}
        >
          Ver reporte
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
                <p class={styles.statLabel}>
                  Reintentos en los últimos 15 minutos
                </p>
                <p class={styles.statValue}>{data().retryCount15m}</p>
              </div>
              <div class={styles.statCard}>
                <p class={styles.statLabel}>
                  Reintentos en las últimas 24 horas
                </p>
                <p class={styles.statValue}>{data().retryCount24h}</p>
              </div>
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
                      <TableCell>
                        {formatAppDateTime(event.createdAt)}
                      </TableCell>
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
