import { createSignal } from "solid-js";
import Button from "~/components/shared/button";
import Input from "~/components/shared/input";
import { searchPhoneAction } from "~/server/modules/searcher/actions";

export default function SearchForm(props: { pending: boolean }) {
  const [searchType, setSearchType] = createSignal<string>("dni");
  const [searchValue, setSearchValue] = createSignal<string>("");

  return (
    <form action={searchPhoneAction} method="post" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Search Type</label>
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
        <label class="block text-sm font-medium mb-2">Search Value</label>
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

      <Button type="submit" disabled={props.pending}>
        {props.pending ? "Searching..." : "Search"}
      </Button>
    </form>
  );
}
