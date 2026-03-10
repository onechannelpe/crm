import { createAsync } from "@solidjs/router";
import { Show, createSignal } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { AppPage } from "~/components/layout/page";
import { teamMembersQuery } from "~/lib/queries/team";

import { TeamMembersSection } from "./components/team-members-section";

import styles from "./team-page.module.css";

export default function TeamPage() {
  const members = createAsync(() => teamMembersQuery());
  const [searchFilter, setSearchFilter] = createSignal("");

  return (
    <AppPage class={styles.page}>
      <Show when={members()} fallback={<Loading />} keyed>
        {(m) => (
          <TeamMembersSection
            members={m}
            searchFilter={searchFilter()}
            onSearchFilterInput={setSearchFilter}
          />
        )}
      </Show>
    </AppPage>
  );
}
