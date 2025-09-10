"use client";

import { FloatingChat } from "@/components/chat/floating-chat";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // List of routes where Footer should be hidden
  const hideFooterRoutes = ["/profile", "/create-post"];
  const hideFooter = hideFooterRoutes.includes(pathname);

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* <UtilityBar /> */}
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <FloatingChat />
    </div>
  );
}
