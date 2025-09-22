"use client";

import { LanguageToggle } from "@/components/language-toggle";
import { Menu } from "@/components/menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserDropdown } from "@/components/user/user-dropdown";
import { createClient } from "@/lib/supabase/client";
import { Menu as MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CustomerSupportDialog } from "@/components/user/customer-support-dialog";
import { KorCoinsRechargeDialog } from "@/components/user/kor-coins-recharge-dialog";
import { WeetooMarketDialog } from "@/components/user/weetoo-market-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function Header() {
  const t = useTranslations("header");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setIsLoggedIn(!!data.user);
        setAuthChecked(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
        setAuthChecked(true);
        router.refresh();
      }
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  // Ensure first client render matches SSR to avoid hydration mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Memoized render for auth section
  const renderAuthSection = useCallback(() => {
    // Until hydration, render stable skeleton that matches SSR
    if (!hydrated || !authChecked) return <div className="w-[120px] h-8" />;
    if (isLoggedIn) return <UserDropdown />;
    return (
      <>
        <Button
          variant="outline"
          className="cursor-pointer shadow-none h-8 flex items-center"
          asChild
        >
          <Link href="/login">{t("login")}</Link>
        </Button>
        <Button
          className="cursor-pointer shadow-none h-8 md:flex hidden items-center"
          asChild
        >
          <Link href="/register">{t("register")}</Link>
        </Button>
      </>
    );
  }, [authChecked, hydrated, isLoggedIn, t]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background border-border rounded-lg border-b w-full">
      <div className="flex items-center justify-between gap-12 md:gap-4 px-4 md:px-0 h-14 max-w-[1600px] mx-auto">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent font-gmarket">
            WEETOO
          </span>
          {/* <span className="text-xs">We Trade, Weetoo</span> */}
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:block">
          <Menu />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden md:block">
            <LanguageToggle />
          </div>
          {isLoggedIn && (
            <>
              <WeetooMarketDialog />
              <KorCoinsRechargeDialog />
              <CustomerSupportDialog />
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </>
          )}
          <span suppressHydrationWarning>{renderAuthSection()}</span>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild className="">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Toggle Menu"
                >
                  <MenuIcon className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="mr-5">
                <VisuallyHidden>
                  <SheetHeader>
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>
                </VisuallyHidden>
                <div className="flex flex-col gap-4 mt-4">
                  <Menu onNavigate={() => setMenuOpen(false)} />
                  {isLoggedIn && (
                    <div className="md:hidden pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          Theme
                        </span>
                        <ThemeToggle />
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
