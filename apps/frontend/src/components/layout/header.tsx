import {
  action,
  createAsync,
  query,
  redirect,
  useAction,
} from "@solidjs/router";
import { Bell, CircleQuestionMark, Search } from "lucide-solid";
import { deleteCookie } from "vinxi/http";
import { getMe, logout as logoutApi } from "~/lib/server/api";

const loadUser = query(async () => {
  "use server";
  return getMe();
}, "user");

const logoutAction = action(async () => {
  "use server";
  await logoutApi();
  deleteCookie("session");
  throw redirect("/login");
});

export default function Header() {
  const user = createAsync(() => loadUser());
  const logout = useAction(logoutAction);

  return (
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      {/* Breadcrumbs or Page Title could go here */}
      <div class="font-bold text-xl text-gray-800">
        {/* Dynamic Title if needed, or empty for now */}
      </div>

      <div class="flex items-center gap-4">
        <button class="text-gray-400 hover:text-gray-600" title="Buscar">
          <Search class="w-5 h-5" />
        </button>
        <button class="text-gray-400 hover:text-gray-600" title="Ayuda">
          <CircleQuestionMark class="w-5 h-5" />
        </button>
        <button
          class="text-gray-400 hover:text-gray-600 relative"
          title="Notificaciones"
        >
          <Bell class="w-5 h-5" />
          <span class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </div>
    </header>
  );
}
