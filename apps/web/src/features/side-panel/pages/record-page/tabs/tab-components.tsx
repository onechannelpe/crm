import type { JSX } from "solid-js";

import { HiddenTabContent } from "~/features/side-panel/components/hidden-tab";

import type { LeadRecordTabId } from "../model";
import type { TabContentProps } from "./content-props";
import { FilesTab } from "./files";
import { HomeTab } from "./home";
import { NotesTab } from "./notes";
import { SedesTab } from "./sedes";
import { TasksTab } from "./tasks";
import { TimelineTab } from "./timeline";

export const TAB_COMPONENTS: Record<
  LeadRecordTabId,
  (props: TabContentProps) => JSX.Element
> = {
  home: HomeTab,
  timeline: TimelineTab,
  tasks: TasksTab,
  notes: NotesTab,
  files: FilesTab,
  emails: () => <HiddenTabContent title="Correos" />,
  calendar: () => <HiddenTabContent title="Calendario" />,
  sedes: SedesTab,
};
