import { For, Show, createSignal } from "solid-js";

import {
  UpdateEntryCard,
  UpdatesDivider,
  UpdatesEmptyMessage,
  UpdatesFilters,
  UpdatesHero,
  UpdatesRoot,
} from "~/features/updates/components";
import { buildUpdateListJsonLd, JsonLd } from "~/lib/seo";
import { loadUpdates } from "~/lib/updates/load-updates";
import { queryUpdates } from "~/lib/updates/query-updates";
import type { UpdateFilter } from "~/lib/updates/types";

import { UPDATES_PAGE_COPY } from "./updates-page.data";

export default function UpdatesPage() {
  const [filter, setFilter] = createSignal<UpdateFilter>("all");
  const updates = loadUpdates();
  const visibleUpdates = () => queryUpdates(updates, filter());

  return (
    <>
      <UpdatesHero
        body={UPDATES_PAGE_COPY.heroBody}
        titleBold={UPDATES_PAGE_COPY.titleBold}
        titleMuted={UPDATES_PAGE_COPY.titleMuted}
      />

      <UpdatesFilters
        active={filter()}
        onChange={setFilter}
        options={[
          { label: UPDATES_PAGE_COPY.filters.all, value: "all" },
          { label: UPDATES_PAGE_COPY.filters.technical, value: "technical" },
          {
            label: UPDATES_PAGE_COPY.filters.releaseNightly,
            value: "release-nightly",
          },
          { label: UPDATES_PAGE_COPY.filters.releaseWeekly, value: "release-weekly" },
        ]}
      />

      <Show when={visibleUpdates().length > 0}>
        <JsonLd data={buildUpdateListJsonLd(visibleUpdates())} />
      </Show>

      <UpdatesRoot
        titleBold={UPDATES_PAGE_COPY.titleBold}
        titleMuted={UPDATES_PAGE_COPY.titleMuted}
      >
        <Show
          when={visibleUpdates().length > 0}
          fallback={
            <UpdatesEmptyMessage>
              No updates found for the selected category.
            </UpdatesEmptyMessage>
          }
        >
          <For each={visibleUpdates()}>
            {(entry, idx) => (
              <>
                <UpdateEntryCard entry={entry} />
                <Show when={idx() < visibleUpdates().length - 1}>
                  <UpdatesDivider />
                </Show>
              </>
            )}
          </For>
        </Show>
      </UpdatesRoot>
    </>
  );
}
