import { createSignal, Show } from "solid-js";

export default function SearchFilters() {
  const [activeTab, setActiveTab] = createSignal<"Filtros" | "Guardados">(
    "Filtros",
  );

  return (
    <div class="flex flex-col h-full">
      <div class="px-6 pt-6 pb-2">
        <div class="flex items-center gap-6 border-b border-gray-100 pb-px">
          <TabButton
            label="Filtros"
            isActive={activeTab() === "Filtros"}
            onClick={() => setActiveTab("Filtros")}
          />
          <TabButton
            label="Guardados"
            isActive={activeTab() === "Guardados"}
            onClick={() => setActiveTab("Guardados")}
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-2">
        <Show when={activeTab() === "Filtros"}>
          <div class="space-y-1">
            <FilterSection title="Búsqueda por palabra" isOpen={true} />
            <FilterSection title="Documento (RUC/DNI)" />
            <FilterSection title="Ubicación" />
            <FilterSection title="Industria / Rubro" />
          </div>
        </Show>

        <Show when={activeTab() === "Guardados"}>
          <div class="py-12 text-center">
            <p class="text-sm text-gray-400">No hay búsquedas guardadas.</p>
          </div>
        </Show>
      </div>

      <div class="p-6 border-t border-gray-200 bg-gray-50 mt-auto">
        <button class="w-full py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
          Guardar búsqueda actual
        </button>
      </div>
    </div>
  );
}

function TabButton(props: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      class={`pb-3 text-sm font-semibold transition-colors relative ${
        props.isActive ? "text-black" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {props.label}
      {props.isActive && (
        <div class="absolute -bottom-px left-0 right-0 h-0.5 bg-black rounded-full" />
      )}
    </button>
  );
}

function FilterSection(props: { title: string; isOpen?: boolean }) {
  const [isOpen, setIsOpen] = createSignal(props.isOpen || false);

  return (
    <div class="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="w-full flex items-center justify-between py-4 px-1 group hover:bg-gray-50 transition-colors rounded-sm"
      >
        <span class="text-sm font-medium text-gray-700 group-hover:text-black">
          {props.title}
        </span>
        <ArrowIcon isOpen={isOpen()} />
      </button>

      <Show when={isOpen()}>
        <div class="pb-4 px-1">
          <input
            type="text"
            placeholder={`Filtrar por ${props.title.toLowerCase()}...`}
            class="w-full px-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-black transition-colors"
          />
        </div>
      </Show>
    </div>
  );
}

function ArrowIcon(props: { isOpen: boolean }) {
  return (
    <svg
      class={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
        props.isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
