import { createSignal } from "solid-js";
import LayoutShell from "~/components/layout-shell";
import CreateUserForm from "~/components/team/create-user-form";
import UserList from "~/components/team/user-list";

interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Agente";
  status: "Activo" | "Pendiente";
}

export default function TeamPage() {
  const [users] = createSignal<User[]>([
    {
      id: 1,
      name: "David D.",
      email: "david@company.inc",
      role: "Admin",
      status: "Activo",
    },
    {
      id: 2,
      name: "Alex D.",
      email: "alex@company.inc",
      role: "Agente",
      status: "Activo",
    },
    {
      id: 3,
      name: "Sara M.",
      email: "sara@company.inc",
      role: "Agente",
      status: "Pendiente",
    },
  ]);

  return (
    <LayoutShell sidebar={<CreateUserForm />}>
      <UserList users={users()} />
    </LayoutShell>
  );
}
