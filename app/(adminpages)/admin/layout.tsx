"use client";

import { LeftSidebar } from "@/components/admin/left-sidebar";
import { SidebarHeading } from "@/components/admin/sidebar-heading";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    if (redirecting.current) return;

    if (!loading) {
      if (!user) {
        redirecting.current = true;
        router.replace("/login?next=/admin");
      } else if (!isAdmin) {
        redirecting.current = true;
        router.replace("/");
      }
    }
  }, [loading, user, isAdmin, router]);

  // Don't render anything while checking auth or redirecting
  if (loading || !user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-full w-full">
      <div className="w-full h-full flex">
        <LeftSidebar />
        <main className="flex-1 flex flex-col h-full">
          <SidebarHeading />
          <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
