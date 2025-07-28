"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CustomerSupportDialog } from "@/components/user/customer-support-dialog";
import { KorCoinsRechargeDialog } from "@/components/user/kor-coins-recharge-dialog";
import { WeetooMarketDialog } from "@/components/user/weetoo-market-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setIsLoggedIn(!!data.session);
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

  // Memoized render for auth section
  const renderAuthSection = useCallback(() => {
    if (!authChecked) return <div className="w-[120px] h-8" />;
    if (isLoggedIn) return <UserDropdown />;
    return (
      <>
        <Button
          variant="outline"
          className="cursor-pointer shadow-none h-8"
          asChild
        >
          <Link href="/login">Login</Link>
        </Button>
        <Button className="cursor-pointer shadow-none h-8" asChild>
          <Link href="/register">Register</Link>
        </Button>
      </>
    );
  }, [authChecked, isLoggedIn]);

  return (
    <header className="w-full border-dashed border-border border-b sticky top-0 z-50 bg-background ">
      <div className="h-14 flex justify-between w-full items-center container mx-auto gap-2 md:gap-4 px-4">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            WEETOO
          </span>
          {/* <span className="text-xs">We Trade, Weetoo</span> */}
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:block">
          <Menu />
        </div>

        <div className="flex items-center gap-2">
          <WeetooMarketDialog />
          <KorCoinsRechargeDialog />
          <CustomerSupportDialog />
          <ThemeToggle />
          {renderAuthSection()}

          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Toggle Menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <VisuallyHidden>
                <SheetHeader>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
              </VisuallyHidden>
              <div className="flex flex-col gap-4 mt-4">
                <Menu />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
