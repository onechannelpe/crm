import type { Component } from "solid-js";

import Activity from "~/components/icons/activity";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import CircleCheckBig from "~/components/icons/circle-check-big";
import House from "~/components/icons/house";
import Inbox from "~/components/icons/inbox";
import Info from "~/components/icons/info";
import Mail from "~/components/icons/mail";
import Package from "~/components/icons/package";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import User from "~/components/icons/user";
import UserRound from "~/components/icons/user-round";
import Users from "~/components/icons/users";
import type { RouteIcon } from "~/lib/nav/nav-config";

export const ICON_BY_ROUTE: Record<
  RouteIcon,
  Component<{ class?: string; size?: string | number }>
> = {
  search: Search,
  settings: Settings,
  team: Users,
  inventory: Package,
  sales: Inbox,
  leads: User,
  dashboard: House,
  "new-sale": Mail,
  confirmed: CircleCheckBig,
  review: ShieldCheck,
  audit: Info,
  capacity: Building2,
  profile: UserRound,
  schedule: CalendarDays,
  monitoring: Activity,
};
