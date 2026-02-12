import { A, action, createAsync, useAction, useLocation } from "@solidjs/router";
import { LayoutDashboard, Users, Receipt, MessageSquare, LogOut } from "lucide-solid";
import { For } from "solid-js";
import { requireAuth, getAuthSession } from "~/infrastructure/auth/session";
import { UsersRepository } from "~/infrastructure/db/repositories/users";

const loadUser = async () => {
  "use server";
  const session = await requireAuth();
  return await UsersRepository.getById(session.userId);
};

const logoutAction = action(async () => {
  "use server";
  const session = await getAuthSession();
  await session.clear();
  throw new Error("Logged out");
}, "logout");

export function Sidebar() {
  const location = useLocation();
  const user = createAsync(() => loadUser());
  const logout = useAction(logoutAction);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Ventas", href: "/sales/new", icon: Receipt },
    { label: "Validación", href: "/validation", icon: MessageSquare },
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
              class={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === item.href
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
            {user()?.full_name?.substring(0, 2).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{user()?.full_name}</p>
            <p class="text-xs text-gray-500 truncate">{user()?.role}</p>
          </div>
          <button
            type="button"
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
