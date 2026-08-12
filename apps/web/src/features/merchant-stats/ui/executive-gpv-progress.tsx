import { createAsync, useNavigate } from "@solidjs/router";
import {
  createMemo,
  ErrorBoundary,
  Show,
  Suspense,
  type Accessor,
} from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import CircleCheckBig from "~/components/icons/circle-check-big";
import { AppPageBody } from "~/components/layout/page";
import { Skeleton } from "~/components/ui/feedback/skeleton";
import type {
  ExecutiveGpvMerchantView,
  ExecutiveGpvProgressView,
} from "~/contracts/merchant-stats/views";
import { formatCalendarDate } from "~/domain/time/app-time";
import {
  calendarDateParts,
  type CalendarDate,
} from "~/domain/time/calendar-date";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { formatSoles } from "~/features/merchant-stats/format";
import { executiveGpvProgressQuery } from "~/rpc/merchant-stats/executive-gpv-progress";

import styles from "./executive-gpv-progress.module.css";

const DAY_MS = 86_400_000;

export function ExecutiveGpvProgress() {
  const portfolio = createAsync(() => executiveGpvProgressQuery());

  return (
    <AppPageBody>
      <ErrorBoundary fallback={<PortfolioError />}>
        <Suspense fallback={<PortfolioLoading />}>
          <Show when={portfolio()}>
            {(data) => <PortfolioContent portfolio={data} />}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </AppPageBody>
  );
}

function PortfolioContent(props: {
  portfolio: Accessor<ExecutiveGpvProgressView>;
}) {
  const navigate = useNavigate();

  const portfolio = () => props.portfolio();

  const columns = createMemo(() => merchantColumns(portfolio().cutDate));

  return (
    <>
      <ViewBar
        count={portfolio().merchants.length}
        cutDate={portfolio().cutDate}
      />

      <DataGrid
        ariaLabel="Mis comercios"
        columns={columns()}
        emptyState={
          <EmptyState
            title="Aún no tienes comercios asignados."
            description="Los comercios aparecerán aquí cuando se te asigne su gestión."
          />
        }
        rowId={(merchant) => merchant.ruc}
        rowOpenIndicator="route"
        source={{
          status: "ready",
          rows: portfolio().merchants,
        }}
        onRowOpen={(merchant) =>
          navigate(
            merchant.leadId
              ? `/records/${merchant.leadId}`
              : `/records?query=${encodeURIComponent(merchant.ruc)}`,
          )
        }
      />
    </>
  );
}

function ViewBar(props: { count: number; cutDate: CalendarDate | null }) {
  return (
    <div class={styles.viewBar}>
      <div class={styles.viewIdentity}>
        <Building2 size={16} class={styles.viewIcon} />
        <span class={styles.viewLabel}>Mis comercios</span>
        <span class={styles.viewMeta}>· {merchantCountLabel(props.count)}</span>
      </div>

      <Show
        when={props.cutDate}
        fallback={
          <span class={styles.updated}>GPV pendiente de actualización</span>
        }
      >
        {(cutDate) => (
          <span class={styles.updated}>
            Actualizado al {formatCalendarDate(cutDate())}
          </span>
        )}
      </Show>
    </div>
  );
}

function PortfolioLoading() {
  return (
    <>
      <div class={styles.viewBar}>
        <Skeleton width={140} height={16} />
      </div>
      <div class={styles.loadingBody}>
        <Skeleton height={280} />
      </div>
    </>
  );
}

function PortfolioError() {
  return (
    <EmptyState
      title="No se pudo cargar tu portafolio"
      description="Vuelve a intentarlo en unos segundos."
    />
  );
}

function merchantCountLabel(count: number): string {
  return `${count} ${count === 1 ? "comercio" : "comercios"}`;
}

function merchantColumns(
  cutDate: CalendarDate | null,
): ReadonlyArray<DataGridColumn<ExecutiveGpvMerchantView>> {
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
      key: "activation",
      label: "Activación",
      icon: CircleCheckBig,
      width: 130,
      renderCell: (merchant) => (
        <span class={styles.muted}>{activationLabel(merchant.isActive)}</span>
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

function activationLabel(isActive: boolean | null): string {
  if (isActive === null) {
    return "Pendiente";
  }

  return isActive ? "Activo" : "Inactivo";
}

function lastTransactionLabel(
  lastTransaction: CalendarDate | null,
  cutDate: CalendarDate | null,
): string {
  if (!lastTransaction) {
    return "Sin transacciones";
  }

  if (!cutDate) {
    return formatCalendarDate(lastTransaction);
  }

  const days = daysBetween(lastTransaction, cutDate);

  if (days === 0) {
    return "Hoy";
  }
  if (days === 1) {
    return "Hace 1 día";
  }

  return `Hace ${days} días`;
}

function daysBetween(from: CalendarDate, to: CalendarDate): number {
  const fromParts = calendarDateParts(from);
  const toParts = calendarDateParts(to);

  const fromTime = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toTime = Date.UTC(toParts.year, toParts.month - 1, toParts.day);

  return Math.max(0, Math.floor((toTime - fromTime) / DAY_MS));
}
