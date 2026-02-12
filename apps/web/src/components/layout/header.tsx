import { Bell, Search } from "lucide-solid";

export function Header() {
    return (
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div class="font-bold text-xl text-gray-800"></div>

            <div class="flex items-center gap-4">
                <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600"
                    title="Buscar"
                >
                    <Search class="w-5 h-5" />
                </button>
                <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600 relative"
                    title="Notificaciones"
                >
                    <Bell class="w-5 h-5" />
                    <span class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
            </div>
        </header>
    );
}
