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
    <div
      className="flex-1 flex flex-col font-[family-name:var(--font-geist-sans)] min-h-screen w-full"
      suppressHydrationWarning
    >
      {/* <UtilityBar /> */}
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      {!hideFooter && <Footer />}
      <FloatingChat />
    </div>
  );
}
