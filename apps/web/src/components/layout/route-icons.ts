import type { Component } from "solid-js";

import Activity from "~/components/icons/activity";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import House from "~/components/icons/house";
import Info from "~/components/icons/info";
import Moneybag from "~/components/icons/moneybag";
import Package from "~/components/icons/package";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import User from "~/components/icons/user";
import UserRound from "~/components/icons/user-round";
import Users from "~/components/icons/users";
import type { RouteIcon } from "~/lib/nav/config";

export const ICON_BY_ROUTE: Record<
  RouteIcon,
  Component<{ class?: string; size?: string | number }>
> = {
  search: Search,
  settings: Settings,
  team: Users,
  inventory: Package,
  leads: User,
  "rate-simulator": Moneybag,
  dashboard: House,
  audit: Info,
  capacity: Building2,
  profile: UserRound,
  schedule: CalendarDays,
  monitoring: Activity,
  "business-stats": ChartColumn,
};
