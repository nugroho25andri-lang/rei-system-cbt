import { requireAdminSession } from "@/lib/session";
import AdminChrome from "@/components/admin-chrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  return <AdminChrome nama={session.nama} username={session.username} role={session.role}>{children}</AdminChrome>;
}
