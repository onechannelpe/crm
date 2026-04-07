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

import {
  LEAD_CREATE_PRIMARY_TABS,
  LEAD_CREATE_SECONDARY_TABS,
  type LeadCreatePrimaryTabId,
  type LeadCreateSecondaryTabId,
  type LeadCreateTabId,
} from "../model";

export type TabId = LeadCreatePrimaryTabId;
export type HiddenTabId = LeadCreateSecondaryTabId;
export type ExtendedTabId = LeadCreateTabId;

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
  { id: LEAD_CREATE_PRIMARY_TABS[0], icon: HomeTabler, label: "Home" },
  { id: LEAD_CREATE_PRIMARY_TABS[1], icon: TimelineEvent, label: "Timeline" },
  { id: LEAD_CREATE_PRIMARY_TABS[2], icon: Checkbox, label: "Tasks" },
] as const;

export const HIDDEN_TAB_ITEMS: ReadonlyArray<{
  id: HiddenTabId;
  label: string;
}> = [
  { id: LEAD_CREATE_SECONDARY_TABS[0], label: "Notes" },
  { id: LEAD_CREATE_SECONDARY_TABS[1], label: "Files" },
  { id: LEAD_CREATE_SECONDARY_TABS[2], label: "Emails" },
  { id: LEAD_CREATE_SECONDARY_TABS[3], label: "Calendar" },
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
