import { createSignal, For, Show } from "solid-js";

import {
  getUserLoginRetryReport,
  type UserLoginRetryReport,
} from "~/actions/admin/auth-security";
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
import { useAsyncAction } from "~/hooks/use-async-action";
import { getErrorMessage } from "~/lib/errors";
import { APP_LOCALE } from "~/lib/locale";

import styles from "./login-retries-card.module.css";

function formatDate(value: number): string {
  return new Date(value).toLocaleString(APP_LOCALE);
}

function labelFor(stage: string): string {
  if (stage === "challenge") return "Desafío de clave de acceso";
  if (stage === "verify") return "Verificación de clave de acceso";
  return "Inicio de sesión con contraseña";
}

export function LoginRetriesCard() {
  const [email, setEmail] = createSignal("");
  const [report, setReport] = createSignal<UserLoginRetryReport | null>(null);
  const { enqueueErrorSnackBar, enqueueInfoSnackBar } = useSnackBar();

  const [lookup, isLookingUp] = useAsyncAction(async () => {
    try {
      const next = await getUserLoginRetryReport(email());
      setReport(next);
      if (!next) enqueueInfoSnackBar("Usuario no encontrado");
    } catch (err: unknown) {
      enqueueErrorSnackBar(getErrorMessage(err, "No se pudo cargar el reporte"));
    }
  });

  return (
    <section class={styles.root}>
      <form
        class={styles.form}
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
        <Button type="submit" loading={isLookingUp()} disabled={isLookingUp()}>
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
