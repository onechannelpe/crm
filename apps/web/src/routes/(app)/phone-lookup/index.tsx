import { useSubmission } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import Button from "~/components/shared/button";
import Input from "~/components/shared/input";
import { searchPhoneAction } from "~/server/modules/searcher/actions";

export default function PhoneLookupPage() {
  const [searchType, setSearchType] = createSignal<string>("dni");
  const [searchValue, setSearchValue] = createSignal<string>("");
  const submission = useSubmission(searchPhoneAction);

  return (
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Phone Number Lookup</h1>

      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <form action={searchPhoneAction} method="post" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              Search Type
            </label>
            <select
              name="searchType"
              value={searchType()}
              onChange={(e) => setSearchType(e.target.value)}
              class="w-full px-3 py-2 border rounded-md"
            >
              <option value="dni">DNI (National ID)</option>
              <option value="ruc">RUC (Tax ID)</option>
              <option value="phone">Phone Number</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              Search Value
            </label>
            <Input
              name="searchValue"
              placeholder={
                searchType() === "dni"
                  ? "Enter DNI..."
                  : searchType() === "ruc"
                    ? "Enter RUC..."
                    : "Enter phone number..."
              }
              value={searchValue()}
              onInput={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submission.pending}>
            {submission.pending ? "Searching..." : "Search"}
          </Button>
        </form>
      </div>

      <Show when={submission.result}>
        {(data) => (
          <div class="bg-white rounded-lg shadow p-6">
            <Show when={data().error}>
              <div class="text-red-600 p-4 bg-red-50 rounded">
                {data().error}
              </div>
            </Show>

            <Show when={data().result}>
              {(result) => (
                <div>
                  <h2 class="text-xl font-semibold mb-4">
                    Search Results
                  </h2>
                  <Show
                    when={result().found && result().count > 0}
                    fallback={
                      <p class="text-gray-500">No results found</p>
                    }
                  >
                    <p class="text-sm text-gray-600 mb-4">
                      Found {result().count} result(s) for{" "}
                      {result().query_type}: {result().query}
                    </p>
                    <div class="space-y-4">
                      <For each={result().results}>
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
                              <span class="font-medium">
                                Phone Numbers:
                              </span>
                              <div class="mt-1 space-y-1">
                                <For each={item.phones}>
                                  {(phone, idx) => (
                                    <div class="flex items-center gap-2">
                                      <span class="text-lg">
                                        {phone}
                                      </span>
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
              )}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
