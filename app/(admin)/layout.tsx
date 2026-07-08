import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[240px] shrink-0 border-r border-sidebar-border md:block">
        <AdminSidebarNav userEmail={session.user.email} />
      </aside>
      <div className="flex flex-1 flex-col">
        <AdminTopbar adminName={session.user.name ?? "Admin"} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
