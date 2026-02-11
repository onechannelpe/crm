import { For, Show } from "solid-js";
import type { SearchResult } from "~/server/modules/searcher/client";

export default function SearchResults(props: { result: SearchResult }) {
  return (
    <div>
      <h2 class="text-xl font-semibold mb-4">Search Results</h2>
      <Show
        when={props.result.found && props.result.count > 0}
        fallback={<p class="text-gray-500">No results found</p>}
      >
        <p class="text-sm text-gray-600 mb-4">
          Found {props.result.count} result(s) for {props.result.query_type}:{" "}
          {props.result.query}
        </p>
        <div class="space-y-4">
          <For each={props.result.results}>
            {(item) => (
              <div class="border rounded-lg p-4">
                <div class="grid grid-cols-2 gap-4">
                  <Show when={item.dni}>
                    <div>
                      <span class="font-medium">DNI:</span>
                      <span class="ml-2">{item.dni}</span>
                    </div>
                  </Show>
                  <Show when={item.ruc}>
                    <div>
                      <span class="font-medium">RUC:</span>
                      <span class="ml-2">{item.ruc}</span>
                    </div>
                  </Show>
                </div>
                <div class="mt-3">
                  <span class="font-medium">Phone Numbers:</span>
                  <div class="mt-1 space-y-1">
                    <For each={item.phones}>
                      {(phone, idx) => (
                        <div class="flex items-center gap-2">
                          <span class="text-lg">{phone}</span>
                          <Show when={item.operators[idx()]}>
                            <span class="text-sm text-gray-500">
                              ({item.operators[idx()]})
                            </span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
