import { useSearchParams } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import {
  UpdateEntryCard,
  UpdatesDivider,
  UpdatesEmptyMessage,
  UpdatesFilters,
  UpdatesHero,
  UpdatesList,
} from "~/features/updates/components";
import { buildUpdateListJsonLd, JsonLd } from "~/lib/seo";
import {
  loadUpdates,
  parseUpdateFilter,
  queryUpdates,
  type UpdateFilter,
} from "~/lib/updates";

import { UPDATES_PAGE_COPY } from "./updates-page.data";

export default function UpdatesPage() {
  const [searchParams, setSearchParams] = useSearchParams<{
    filter?: string;
  }>();

  const updates = loadUpdates();
  const activeFilter = createMemo<UpdateFilter>(() =>
    parseUpdateFilter(searchParams.filter),
  );
  const visibleUpdates = createMemo(() =>
    queryUpdates(updates, activeFilter()),
  );

  return (
    <>
      <UpdatesHero
        body={UPDATES_PAGE_COPY.heroBody}
        ctaHref={UPDATES_PAGE_COPY.heroCtaHref}
        ctaLabel={UPDATES_PAGE_COPY.heroCtaLabel}
        titleBold={UPDATES_PAGE_COPY.titleBold}
        titleMuted={UPDATES_PAGE_COPY.titleMuted}
      />

      <UpdatesFilters
        active={activeFilter()}
        onChange={(value) =>
          setSearchParams(
            value === "all"
              ? {}
              : {
                  filter: value,
                },
          )
        }
        options={[
          { label: UPDATES_PAGE_COPY.filters.all, value: "all" },
          { label: UPDATES_PAGE_COPY.filters.technical, value: "technical" },
          {
            label: UPDATES_PAGE_COPY.filters.releaseNightly,
            value: "release-nightly",
          },
          {
            label: UPDATES_PAGE_COPY.filters.releaseWeekly,
            value: "release-weekly",
          },
        ]}
      />

      <Show when={visibleUpdates().length > 0}>
        <JsonLd data={buildUpdateListJsonLd(visibleUpdates())} />
      </Show>

      <UpdatesList
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
      </UpdatesList>
    </>
  );
}
