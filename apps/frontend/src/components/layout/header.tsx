import {
  A,
  action,
  createAsync,
  query,
  redirect,
  useAction,
} from "@solidjs/router";
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
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div class="flex items-center gap-8">
        <A href="/" class="font-bold text-lg text-black">
          CRM
        </A>
        <nav class="flex gap-6 text-sm font-medium">
          <A
            href="/search"
            activeClass="text-black border-b-2 border-black"
            class="text-gray-500 hover:text-black pb-1"
          >
            Búsqueda
          </A>
          <A
            href="/validation"
            activeClass="text-black border-b-2 border-black"
            class="text-gray-500 hover:text-black pb-1"
          >
            Validación
          </A>
          <A
            href="/team"
            activeClass="text-black border-b-2 border-black"
            class="text-gray-500 hover:text-black pb-1"
          >
            Equipo
          </A>
        </nav>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">{user()?.name}</span>
        <span class="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
          {user()?.role}
        </span>
        <button
          onClick={() => logout()}
          class="text-sm text-gray-500 hover:text-red-600 font-medium"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
