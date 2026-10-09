import { getUsers, getCurrentUser } from "@/actions/auth";
import { UsersView } from "@/components/users-view";

export default async function AdminUsuariosPage() {
  const [usersRes, session] = await Promise.all([
    getUsers(),
    getCurrentUser(),
  ]);

  const users = usersRes.success && usersRes.data ? usersRes.data : [];

  return <UsersView initialUsers={users} currentUserId={session?.userId} />;
}
