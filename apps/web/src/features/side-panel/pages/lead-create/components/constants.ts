import type { JSX } from "solid-js";

import BrandLinkedin from "~/components/icons/brand-linkedin";
import BrandX from "~/components/icons/brand-x";
import Clock from "~/components/icons/calendar-clock";
import Checkbox from "~/components/icons/checkbox";
import HomeTabler from "~/components/icons/home-tabler";
import LinkIcon from "~/components/icons/link";
import MapIcon from "~/components/icons/map";
import Moneybag from "~/components/icons/moneybag";
import TimelineEvent from "~/components/icons/timeline-event";
import User from "~/components/icons/user";
import UserRound from "~/components/icons/user-round";
import Users from "~/components/icons/users";

export type TabId = "home" | "timeline" | "tasks";

export type IconComponent = (props: {
  size?: number;
  class?: string;
}) => JSX.Element;

export type DisplayField = {
  label: string;
  icon: IconComponent;
  value?: string;
  key?: string;
};

export const TAB_ITEMS: ReadonlyArray<{
  id: TabId;
  icon: IconComponent;
  label: string;
}> = [
  { id: "home", icon: HomeTabler, label: "Home" },
  { id: "timeline", icon: TimelineEvent, label: "Timeline" },
  { id: "tasks", icon: Checkbox, label: "Tasks" },
] as const;

export const FIELD_ROWS: ReadonlyArray<DisplayField> = [
  { label: "RUC", icon: MapIcon, key: "ruc" },
  { label: "Address", icon: MapIcon },
  { label: "ARR", icon: Moneybag },
  { label: "Created by", icon: User, value: "You" },
  { label: "Domain Name", icon: LinkIcon },
  { label: "Employees", icon: Users },
  { label: "ICP", icon: HomeTabler },
  { label: "Linkedin", icon: BrandLinkedin },
  { label: "Last update", icon: Clock, value: "24 minutes ago" },
  { label: "Updated by", icon: UserRound, value: "You" },
  { label: "X", icon: BrandX },
] as const;

export const RELATION_WIDGETS: ReadonlyArray<{
  title: string;
  showSeeAll: boolean;
}> = [
  { title: "Account Owner", showSeeAll: false },
  { title: "Opportunities", showSeeAll: true },
  { title: "People", showSeeAll: true },
] as const;
