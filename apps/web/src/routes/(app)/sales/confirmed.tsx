import { createAsync, useNavigate } from "@solidjs/router";

import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createRouteRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { confirmedSalesRecordsQuery } from "~/lib/queries/sales-records";
import { formatDate } from "~/lib/utils";
import type { SalesRecordQueueItemView } from "~/server/sales-records/application/queries/views/sales-record-view";

type ConfirmedSaleRow = SalesRecordQueueItemView;

const CONFIRMED_SALES_COLUMNS = [
  {
    key: "id",
    label: "ID",
    icon: CircleQuestionMark,
    width: 90,
    sticky: true,
    renderCell: (sale) => `#${sale.id}`,
  },
  {
    key: "companyName",
    label: "Empresa",
    icon: Building2,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => sale.companyName || "-",
  },
  {
    key: "contactName",
    label: "Contacto",
    icon: UserRound,
    minWidth: 220,
    grow: true,
    renderCell: (sale) => (
      <div class="space-y-1">
        <p class="font-medium">{sale.contactName}</p>
        <p class="text-xs text-muted-foreground">{sale.contactDni}</p>
      </div>
    ),
  },
  {
    key: "executiveName",
    label: "Ejecutivo",
    icon: UserRound,
    width: 180,
    renderCell: (sale) => sale.executiveName,
  },
  {
    key: "updatedAt",
    label: "Confirmado",
    icon: CalendarDays,
    width: 160,
    renderCell: (sale) => formatDate(sale.updatedAt),
  },
] satisfies ReadonlyArray<DataGridColumn<ConfirmedSaleRow>>;

export default function ConfirmedSalesPage() {
  const navigate = useNavigate();
  const sales = createAsync(() => confirmedSalesRecordsQuery());
  const rows = () => sales() ?? [];
  const isLoading = () => sales() === undefined;
  const rowOpen = createRouteRowOpen<ConfirmedSaleRow>((sale) => {
    navigate(`/sales/${sale.id}`);
  });

  return (
    <AppPage>
      <DataGrid
        ariaLabel="Ventas confirmadas"
        columns={[...CONFIRMED_SALES_COLUMNS]}
        emptyState={
          <EmptyState
            title="Sin ventas confirmadas"
            description="Las ventas confirmadas aparecerán aquí."
          />
        }
        rowOpen={rowOpen}
        source={{
          status: isLoading() ? "pending" : "ready",
          rows: rows(),
        }}
      />
    </AppPage>
  );
}
