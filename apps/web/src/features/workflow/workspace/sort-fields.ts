import Building2 from "~/components/icons/building-2";
import CalendarClock from "~/components/icons/calendar-clock";
import CalendarDays from "~/components/icons/calendar-days";
import User from "~/components/icons/user";
import type { RecordIndexSortField } from "~/features/record-index/model/catalog";

export const LEAD_WORKSPACE_SORT_FIELDS = [
  {
    prefix: "createdAt",
    label: "Fecha de registro",
    icon: CalendarDays,
  },
  {
    prefix: "updatedAt",
    label: "Ultima modificacion",
    icon: CalendarClock,
  },
  {
    prefix: "registeredBy",
    label: "Registrado por",
    icon: User,
  },
  {
    prefix: "ruc",
    label: "RUC",
    icon: Building2,
  },
] as const satisfies ReadonlyArray<RecordIndexSortField>;
