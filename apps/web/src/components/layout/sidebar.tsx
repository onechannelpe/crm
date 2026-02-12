import { A, useLocation } from "@solidjs/router";
import { LayoutDashboard, Users, Receipt, MessageSquare, LogOut, ShieldCheck, Package } from "lucide-solid";
import { createResource, For } from "solid-js";
import { getMe, logout } from "~/actions/auth";

export function Sidebar() {
    const location = useLocation();
    const [user] = createResource(getMe);

    const handleLogout = async () => {
        await logout();
        window.location.href = "/login";
    };

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Leads", href: "/leads", icon: Users },
        { label: "Ventas", href: "/sales/new", icon: Receipt },
        { label: "Validación", href: "/validation", icon: MessageSquare },
        { label: "Cuota", href: "/quota", icon: ShieldCheck },
        { label: "Equipo", href: "/team", icon: Users },
        { label: "Inventario", href: "/inventory", icon: Package },
    ];

    return (
        <aside class="fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-10">
            <div class="h-16 flex items-center px-6 border-b border-gray-100">
                <div class="flex items-center gap-2 text-blue-600 font-bold text-xl">
                    <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        C
                    </div>
                    <span class="text-gray-900">CRM</span>
                </div>
            </div>

            <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <For each={navItems}>
                    {(item) => (
                        <A
                            href={item.href}
                            class={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname.startsWith(item.href)
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            <item.icon class="w-5 h-5" />
                            {item.label}
                        </A>
                    )}
                </For>
            </nav>

            <div class="p-4 border-t border-gray-200">
                <div class="flex items-center gap-3 p-2 rounded-lg">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {user()?.fullName?.substring(0, 2).toUpperCase() ?? ".."}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{user()?.fullName ?? "..."}</p>
                        <p class="text-xs text-gray-500 truncate">{user()?.role}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        class="text-gray-400 hover:text-red-500"
                        title="Cerrar sesión"
                    >
                        <LogOut class="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
