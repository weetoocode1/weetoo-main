"use client";

import { Button } from "../ui/button";
import { PanelLeftIcon } from "lucide-react";
import { useSidebarStore } from "@/lib/store/sidebar-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import { getAdminPageTitle } from "@/lib/admin-navigation";

export function SidebarHeading() {
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
    <div className="h-14 border-b flex items-center px-4 justify-between">
      <div className="flex items-center gap-2">
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
        <span className="font-semibold text-foreground">
          {getAdminPageTitle(pathname)}
        </span>
      </div>

      <ThemeToggle />
    </div>
  );
}
