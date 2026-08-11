import { createAsync } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  Show,
  Suspense,
} from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { Badge } from "~/components/ui/display/badge";
import { SearchInput } from "~/components/ui/input/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type {
  CommissionManagerView,
  CorporateCaja2Result,
  CorporateCaja2UserRow,
  MassMarketCaja1Result,
  MassMarketCaja2Result,
} from "~/contracts/merchant-stats/commission-views";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetGrid,
  WidgetGridItem,
  WidgetStatGrid,
} from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { commissionManagerDashboardQuery } from "~/rpc/merchant-stats/commission-scheme";

import {
  formatInteger,
  formatMonth,
  formatPercent,
  formatSolesCompact,
} from "../format";
import { AggregateTile } from "../tiles";

import styles from "../merchant-gpv-dashboard.module.css";

// Ordered by daily-review priority: Caja 1 mass-market first, Caja 2
// second, both penalidades next (they gate those same two cajas), Caja 3
// and the corporate desk last.
export function CommissionTab() {
  const view = createAsync(() => commissionManagerDashboardQuery());

  return (
    <div class={styles.surface}>
      <ErrorBoundary fallback={<TabError />}>
        <Suspense fallback={<WidgetSkeleton />}>
          <Show
            when={view()}
            fallback={
              <EmptyState
                title="Sin datos de comisiones"
                description="Importa un reporte de GPV para calcular las cajas y penalidades."
              />
            }
          >
            {(readyView) => <CommissionContent view={readyView()} />}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function TabError() {
  return (
    <EmptyState
      title="No se pudo cargar el panel de comisiones"
      description="Vuelve a intentarlo en unos segundos."
    />
  );
}

function PendingCard(props: { title: string }) {
  return (
    <WidgetGridItem span="full">
      <WidgetCardShell title={props.title}>
        <p class={styles.helperText}>
          Sin configurar. Defínelo en Ajustes → Esquema de comisiones.
        </p>
      </WidgetCardShell>
    </WidgetGridItem>
  );
}

function CommissionContent(props: { view: CommissionManagerView }) {
  const monthLabel = () => formatMonth(props.view.cohortMonth);

  return (
    <div class={styles.scrollArea}>
      <ScrollWrapper>
        <MassMarketCaja1Section
          result={props.view.massMarketCaja1}
          monthLabel={monthLabel()}
        />
        <MassMarketCaja2Section result={props.view.massMarketCaja2} />

        <Show
          when={
            props.view.penalidadReversion.status === "evaluated"
              ? props.view.penalidadReversion
              : null
          }
          fallback={<PendingCard title="Penalidad de reversión" />}
        >
          {(reversion) => (
            <WidgetStatGrid>
              <AggregateTile
                title="POS comisionados (M0+M1)"
                span="quarter"
                value={formatInteger(reversion().commissionedCount)}
              />
              <AggregateTile
                title="POS penalizados (M2)"
                span="quarter"
                value={formatInteger(reversion().penalizedCount)}
              />
              <AggregateTile
                title="Reversión conocida"
                span="quarter"
                value={formatSolesCompact(reversion().knownReversalTotal)}
                caption={
                  reversion().unknownReversalCount > 0
                    ? `${formatInteger(reversion().unknownReversalCount)} con pago aún sin definir`
                    : undefined
                }
              />
            </WidgetStatGrid>
          )}
        </Show>

        <Show
          when={
            props.view.penalidadActivacion.status === "evaluated"
              ? props.view.penalidadActivacion
              : null
          }
          fallback={<PendingCard title="Penalidad de activación" />}
        >
          {(activacion) => (
            <WidgetStatGrid>
              <AggregateTile
                title="Tasa de inactivas"
                span="quarter"
                value={formatPercent(activacion().inactiveRate)}
                caption={`Límite ${formatPercent(activacion().maxInactiveRate)}${activacion().penalized ? " -- penalizado" : ""}`}
              />
              <AggregateTile
                title="Ventas activas"
                span="quarter"
                value={formatInteger(activacion().totalActive)}
                caption={`de ${formatInteger(activacion().totalSales)} ventas`}
              />
            </WidgetStatGrid>
          )}
        </Show>

        <Show
          when={
            props.view.companyCaja3.status === "evaluated"
              ? props.view.companyCaja3
              : null
          }
          fallback={<PendingCard title="Caja 3 -- toda la empresa" />}
        >
          {(caja3) => (
            <WidgetStatGrid>
              <AggregateTile
                title="Caja 3 -- toda la empresa"
                span="quarter"
                value={formatSolesCompact(caja3().totalGpv)}
                caption={`Meta ${formatSolesCompact(caja3().target)}`}
              />
            </WidgetStatGrid>
          )}
        </Show>

        <CorporateCaja2Section result={props.view.corporateCaja2} />
      </ScrollWrapper>
    </div>
  );
}

function MassMarketCaja1Section(props: {
  result: MassMarketCaja1Result;
  monthLabel: string;
}) {
  return (
    <Show
      when={props.result.status === "evaluated" ? props.result : null}
      fallback={<PendingCard title="Caja 1 -- mesa 2 y 3" />}
    >
      {(result) => (
        <WidgetStatGrid>
          <For each={result().mesas}>
            {(mesa) => (
              <AggregateTile
                title={`Caja 1 -- ${mesa.mesa}`}
                span="quarter"
                value={`${formatInteger(mesa.activeCountM0)} / ${formatInteger(mesa.target)}`}
                caption={`${formatInteger(mesa.activeCountM0Plus15)} activas a M0+15${mesa.band?.payout != null ? ` · ${formatSolesCompact(mesa.band.payout)}` : ""}`}
              />
            )}
          </For>
        </WidgetStatGrid>
      )}
    </Show>
  );
}

function MassMarketCaja2Section(props: { result: MassMarketCaja2Result }) {
  return (
    <Show
      when={props.result.status === "evaluated" ? props.result : null}
      fallback={<PendingCard title="Caja 2 -- mesa 2 y 3" />}
    >
      {(result) => (
        <WidgetStatGrid>
          <For each={result().mesas}>
            {(mesa) => (
              <AggregateTile
                title={`Caja 2 -- ${mesa.mesa}`}
                span="quarter"
                value={formatInteger(
                  mesa.bandsM0PlusM1.reduce((sum, b) => sum + b.activeCount, 0),
                )}
                caption={`POS activos M0+M1 · ${formatInteger(mesa.bandsM2.reduce((sum, b) => sum + b.activeCount, 0))} en M2`}
              />
            )}
          </For>
        </WidgetStatGrid>
      )}
    </Show>
  );
}

function CorporateCaja2Section(props: { result: CorporateCaja2Result }) {
  return (
    <Show
      when={props.result.status === "evaluated" ? props.result : null}
      fallback={<PendingCard title="Caja 2 -- mesa 1 (corporativa)" />}
    >
      {(result) => (
        <>
          <WidgetStatGrid>
            <AggregateTile
              title="Caja 2 -- mesa 1 (M0+M1)"
              span="quarter"
              value={formatInteger(
                result().users.filter((u) => u.m0PlusM1.active).length,
              )}
              caption={`de ${formatInteger(result().users.length)} usuarios`}
            />
            <AggregateTile
              title="Caja 2 -- mesa 1 (M2)"
              span="quarter"
              value={formatInteger(
                result().users.filter((u) => u.m2.active).length,
              )}
              caption={`de ${formatInteger(result().users.length)} usuarios`}
            />
          </WidgetStatGrid>
          <CorporateCaja2UsersTable users={result().users} />
        </>
      )}
    </Show>
  );
}

// Real Culqi usuario identity, independent of whether a CRM user account
// exists for that person -- most usuarios in mesa 1 won't have one, so
// filtering here must not depend on a CRM match.
function CorporateCaja2UsersTable(props: { users: CorporateCaja2UserRow[] }) {
  const [search, setSearch] = createSignal("");

  const filteredUsers = createMemo(() => {
    const query = search().trim().toLowerCase();
    if (!query) {
      return props.users;
    }
    return props.users.filter((user) =>
      `${user.userName ?? ""} ${user.userCode}`.toLowerCase().includes(query),
    );
  });

  return (
    <WidgetGrid>
      <WidgetGridItem span="full">
        <WidgetCardShell title="Caja 2 -- mesa 1, por usuario">
          <div class={styles.userTableStack}>
            <SearchInput
              value={search()}
              onValueChange={setSearch}
              placeholder="Buscar usuario de Culqi..."
              aria-label="Buscar usuario de Culqi"
            />
            <Table aria-label="Usuarios mesa 1 (corporativa)" variant="list">
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead align="right">M0+M1</TableHead>
                  <TableHead align="right">M2</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={filteredUsers()}>
                  {(user) => (
                    <TableRow>
                      <TableCell>{user.userName ?? user.userCode}</TableCell>
                      <TableCell align="right">
                        <UserWindowCell window={user.m0PlusM1} />
                      </TableCell>
                      <TableCell align="right">
                        <UserWindowCell window={user.m2} />
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
            <Show when={filteredUsers().length === 0}>
              <p class={styles.helperText}>
                Sin resultados para esta búsqueda.
              </p>
            </Show>
          </div>
        </WidgetCardShell>
      </WidgetGridItem>
    </WidgetGrid>
  );
}

function UserWindowCell(props: { window: CorporateCaja2UserRow["m0PlusM1"] }) {
  return (
    <span class={styles.userWindowCell}>
      {formatSolesCompact(props.window.qualifyingSum)}
      <Badge variant={props.window.active ? "success" : "secondary"}>
        {props.window.active ? "Activo" : "Inactivo"}
      </Badge>
    </span>
  );
}
