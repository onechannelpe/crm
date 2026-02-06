import { A, useNavigate } from "@solidjs/router";
import { createResource } from "solid-js";
import { getUser, logout } from "~/server/auth-actions";

export default function Header() {
  const navigate = useNavigate();
  const [user] = createResource(() => getUser());

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header class="h-25 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
      <div class="flex items-center gap-8">
        <span class="font-bold text-lg">OrgSearch</span>
        <nav class="flex gap-6 text-sm font-medium">
          <A
            href="/search"
            activeClass="text-black border-b-2 border-black"
            class="text-gray-500 h-14.25 flex items-center"
          >
            Buscar
          </A>
          <A
            href="/team"
            activeClass="text-black border-b-2 border-black"
            class="text-gray-500 h-14.25 flex items-center"
          >
            Equipo
          </A>
        </nav>
      </div>
      <div class="flex items-center gap-4 text-sm">
        <span>{user()?.name}</span>
        <button onClick={handleLogout} class="text-gray-500 hover:text-red-600">
          Salir
        </button>
        <div class="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
          {user()?.name?.charAt(0)}
        </div>
      </div>
    </header>
  );
}
