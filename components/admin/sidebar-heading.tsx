"use client";

import { Button } from "../ui/button";
import { Menu, PanelLeftIcon } from "lucide-react";
import { useSidebarStore } from "@/lib/store/sidebar-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";
import type { FC } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import { getAdminPageTitle } from "@/lib/admin-navigation";

interface SidebarHeadingProps {
  onOpenMobileMenu?: () => void;
}

export const SidebarHeading: FC<SidebarHeadingProps> = ({
  onOpenMobileMenu,
}) => {
  const pathname = usePathname();
  const toggle = useSidebarStore((state) => state.toggle);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "b") {
        event.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <div className="h-14 border-b flex items-center px-4 justify-between py-4 md:py-0">
      <div className="flex items-center gap-2">
        {/* Desktop: collapse/expand button; hidden on small screens */}
        <div className="hidden lg:block">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggle}>
                  <PanelLeftIcon className="w-4 h-4 cursor-pointer" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle sidebar (Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Mobile/Tablet: open sheet trigger; hidden on lg and up */}
        <div className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            aria-label="Open admin menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        <span className="font-semibold text-foreground">
          {getAdminPageTitle(pathname)}
        </span>
      </div>

      <ThemeToggle />
    </div>
  );
};
