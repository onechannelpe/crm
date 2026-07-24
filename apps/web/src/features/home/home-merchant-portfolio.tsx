import { createAsync, useNavigate } from "@solidjs/router";
import {
  createMemo,
  ErrorBoundary,
  Show,
  Suspense,
  type Accessor,
  type JSX,
} from "solid-js";

import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import type {
  HomeMerchantPortfolioView,
  HomeMerchantRowView,
} from "~/contracts/home/views";
import { formatSoles } from "~/features/dashboards/format";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { homeMerchantPortfolioQuery } from "~/lib/queries/home";
import { formatCalendarDate } from "~/lib/time/app-time";
import { calendarDateParts, type CalendarDate } from "~/lib/time/calendar-date";

import styles from "./home-merchant-portfolio.module.css";

const DAY_MS = 86_400_000;

export function HomeMerchantPortfolio() {
  const portfolio = createAsync(() => homeMerchantPortfolioQuery());

  return (
    <ErrorBoundary fallback={<PortfolioError />}>
      <Suspense fallback={<WidgetSkeleton />}>
        <Show when={portfolio()}>
          {(data) => <PortfolioContent portfolio={data} />}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

function PortfolioContent(props: {
  portfolio: Accessor<HomeMerchantPortfolioView>;
}) {
  const navigate = useNavigate();
  const data = props.portfolio;
  const columns = createMemo(() => merchantColumns(data().cutDate));

  return (
    <WidgetCardShell
      title="Mis comercios"
      action={
        <Show when={data().cutDate}>
          {(cutDate) => (
            <span class={styles.updated}>
              Actualizado al {formatCalendarDate(cutDate())}
            </span>
          )}
        </Show>
      }
    >
      <div class={styles.content}>
        <Show when={data().merchants.length > 0} fallback={<PortfolioEmpty />}>
          <p class={styles.summary}>
            {merchantCountLabel(data().merchants.length)}
            <span aria-hidden="true"> · </span>
            <strong>{formatSoles(data().totalGpv)}</strong> de GPV
          </p>
          <div class={styles.grid}>
            <DataGrid
              ariaLabel="Mis comercios"
              columns={columns()}
              emptyState=""
              onRowOpen={(merchant) => {
                navigate(
                  merchant.leadId
                    ? `/records/${merchant.leadId}`
                    : `/records?query=${encodeURIComponent(merchant.ruc)}`,
                );
              }}
              rowId={(merchant) => merchant.ruc}
              rowOpenIndicator="route"
              source={{ status: "ready", rows: data().merchants }}
            />
          </div>
        </Show>
      </div>
    </WidgetCardShell>
  );
}

function PortfolioEmpty() {
  return (
    <div class={styles.empty}>
      <p class={styles.emptyTitle}>Aún no hay GPV para tus comercios.</p>
      <p class={styles.emptyDescription}>
        Aparecerá después de la próxima actualización.
      </p>
    </div>
  );
}

function PortfolioError(): JSX.Element {
  return (
    <WidgetCardShell title="Mis comercios" status="error">
      <span />
    </WidgetCardShell>
  );
}

function merchantCountLabel(count: number): string {
  return `${count} ${count === 1 ? "comercio" : "comercios"}`;
}

function merchantColumns(
  cutDate: CalendarDate | null,
): ReadonlyArray<DataGridColumn<HomeMerchantRowView>> {
  return [
    {
      key: "merchant",
      label: "Comercio",
      icon: Building2,
      minWidth: 240,
      grow: true,
      sticky: true,
      renderCell: (merchant) => (
        <div class={styles.merchant}>
          <span class={styles.merchantName}>{merchant.name}</span>
          <span class={styles.ruc}>{merchant.ruc}</span>
        </div>
      ),
    },
    {
      key: "progress",
      label: "Progreso individual",
      icon: ChartColumn,
      width: 240,
      renderCell: (merchant) => (
        <div class={styles.progress}>
          <span>{formatSoles(merchant.gpv)}</span>
          <Show
            when={merchant.projectedGpv !== null}
            fallback={<span class={styles.muted}>Sin objetivo</span>}
          >
            <span class={styles.muted}>
              de {formatSoles(merchant.projectedGpv ?? 0)}
            </span>
          </Show>
        </div>
      ),
    },
    {
      key: "lastTransaction",
      label: "Última transacción",
      icon: CalendarDays,
      width: 190,
      renderCell: (merchant) => (
        <span class={styles.muted}>
          {lastTransactionLabel(merchant.lastTransactionAt, cutDate)}
        </span>
      ),
    },
  ];
}

function lastTransactionLabel(
  value: CalendarDate | null,
  cutDate: CalendarDate | null,
): string {
  if (!value) {
    return "Sin transacciones";
  }
  if (!cutDate) {
    return formatCalendarDate(value);
  }

  const days = daysBetween(value, cutDate);
  if (days === 0) return "Hoy";
  if (days === 1) return "Hace 1 día";

  return `Hace ${days} días`;
}

function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const fromParts = calendarDateParts(from);
  const toParts = calendarDateParts(to);
  const fromTime = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toTime = Date.UTC(toParts.year, toParts.month - 1, toParts.day);

  return Math.max(0, Math.floor((toTime - fromTime) / DAY_MS));
}
