import { For } from "solid-js";

interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Agente";
  status: "Activo" | "Pendiente";
}

export default function UserList(props: { users: User[] }) {
  return (
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-125">
      <div class="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Equipo</h3>
          <p class="mt-1 text-sm text-gray-500">
            Gestiona quién tiene acceso a la herramienta.
          </p>
        </div>
      </div>

      <ul class="divide-y divide-gray-100">
        <For each={props.users}>{(user) => <UserRow user={user} />}</For>
      </ul>
    </div>
  );
}

function UserRow(props: { user: User }) {
  const { user } = props;

  return (
    <li class="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
      <div class="flex items-center gap-4">
        <div class="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
          {user.name.charAt(0)}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-gray-900">{user.name}</p>
            <RoleBadge role={user.role} />
          </div>
          <p class="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div class="text-right">
        <StatusBadge status={user.status} />
      </div>
    </li>
  );
}

function RoleBadge(props: { role: string }) {
  const isAdmin = props.role === "Admin";
  return (
    <span
      class={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${
        isAdmin
          ? "bg-purple-50 text-purple-700 border-purple-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      }`}
    >
      {props.role}
    </span>
  );
}

function StatusBadge(props: { status: string }) {
  const isActive = props.status === "Activo";
  return (
    <p
      class={`text-xs font-medium ${
        isActive ? "text-green-600" : "text-amber-600"
      }`}
    >
      {props.status}
    </p>
  );
}
