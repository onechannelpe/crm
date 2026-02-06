import { A } from "@solidjs/router";
import { Show } from "solid-js";

export interface SearchResult {
  id: string;
  type: "EMPRESA" | "PERSONA";
  initials: string;
  name: string;
  identifier: string;
  roleOrIndustry: string;
  status: "Activo" | "Inactivo";
  phone: string;
  location: string;
  avatarUrl?: string;
}

export default function ResultRow(props: { result: SearchResult }) {
  const { result } = props;

  return (
    <A
      href={`/search/${result.id}`}
      class="group flex items-center gap-4 py-4 px-4 bg-white border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div class="shrink-0 pt-1" onClick={(e) => e.preventDefault()}>
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
        />
      </div>

      <div class="shrink-0">
        <div class="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
          <Show
            when={result.avatarUrl}
            fallback={
              <span class="text-xs font-bold text-gray-600">
                {result.initials}
              </span>
            }
          >
            <img
              src={result.avatarUrl}
              alt={result.name}
              class="h-full w-full object-cover"
            />
          </Show>
        </div>
      </div>

      <div class="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
        <div class="col-span-12 sm:col-span-5">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {result.name}
            </p>
            <svg
              class="w-3.5 h-3.5 text-blue-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <p class="text-xs text-gray-500 font-mono mt-0.5">
            {result.identifier}
          </p>
        </div>

        <div class="hidden sm:block sm:col-span-3">
          <p class="text-sm text-gray-600 truncate">{result.roleOrIndustry}</p>
          <p class="text-xs text-gray-400 mt-0.5">{result.location}</p>
        </div>

        <div class="hidden sm:block sm:col-span-2 text-right">
          <span
            class={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${
              result.status === "Activo"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {result.status}
          </span>
        </div>

        <div class="hidden sm:flex sm:col-span-2 justify-end">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-900 group-hover:border-green-200 group-hover:text-green-800">
            <svg
              class="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {result.phone}
          </div>
        </div>
      </div>
    </A>
  );
}
