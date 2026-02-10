import { A, useLocation } from "@solidjs/router";
import {
  Users,
  LayoutDashboard,
  UserPlus,
  Receipt,
  Star,
  MessageSquare,
  LogOut,
} from "lucide-solid";
import { createAsync, action, useAction, redirect } from "@solidjs/router";
import { getMe, logout as logoutApi } from "~/lib/server/api";
import { deleteCookie } from "vinxi/http";
import { Show } from "solid-js";

const loadUser = async () => {
  "use server";
  return getMe();
};

const logoutAction = action(async () => {
  "use server";
  await logoutApi();
  deleteCookie("session");
  throw redirect("/login");
});

export default function Sidebar() {
  const location = useLocation();
  const user = createAsync(() => loadUser());
  const logout = useAction(logoutAction);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { label: "Prospectos", href: "/leads", icon: Users },
    { label: "Ventas", href: "/sales", icon: Receipt },
    { label: "Interacciones", href: "/interactions", icon: MessageSquare },
    { label: "Equipo", href: "/team", icon: UserPlus },
    { label: "Productos", href: "/products", icon: Star },
  ];

  return (
    <aside class="fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Logo */}
      <div class="h-16 flex items-center px-6 border-b border-gray-100">
        <div class="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">
            OC
          </div>
          <span class="text-gray-900">OneChannel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
          CRM
        </div>

        {navItems.map((item) => (
          <A
            href={item.href}
            class={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.href)
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <item.icon
              class={`w-5 h-5 ${isActive(item.href) ? "text-blue-600" : "text-gray-400"}`}
            />
            {item.label}
          </A>
        ))}
      </nav>

      {/* User Profile */}
      <div class="p-4 border-t border-gray-200">
        <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group relative">
          <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
            <img
              src={`https://ui-avatars.com/api/?name=${user()?.name || "U"}&background=random`}
              alt="User"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {user()?.name}
            </p>
            <p class="text-xs text-gray-500 truncate">{user()?.role}</p>
          </div>
          <button
            onClick={() => logout()}
            class="text-gray-400 hover:text-red-500"
            title="Logout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
