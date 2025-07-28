import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col h-full">
      <AdminHeader />
      <main className="flex-1 flex flex-col h-full p-4">{children}</main>
    </div>
  );
}
