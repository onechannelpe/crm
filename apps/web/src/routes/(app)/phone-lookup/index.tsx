import { useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import SearchForm from "~/components/searcher/search-form";
import SearchResults from "~/components/searcher/search-results";
import { searchPhoneAction } from "~/server/modules/searcher/actions";

export default function PhoneLookupPage() {
  const submission = useSubmission(searchPhoneAction);

  return (
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Phone Number Lookup</h1>

      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <SearchForm pending={submission.pending} />
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
              {(result) => <SearchResults result={result()} />}
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}
