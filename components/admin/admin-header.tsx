"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { AdminNav } from "./admin-nav";
import { AdminNotification } from "./admin-notification";
import { AdminProfile } from "./admin-profile";

export function AdminHeader() {
  const navRef = useRef<HTMLDivElement>(null);
  const [showLeftChevron, setShowLeftChevron] = useState(false);
  const [showRightChevron, setShowRightChevron] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (navRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
        setShowLeftChevron(scrollLeft > 0);
        setShowRightChevron(scrollLeft < scrollWidth - clientWidth);
      }
    };

    const navElement = navRef.current;
    if (navElement) {
      checkOverflow();
      navElement.addEventListener("scroll", checkOverflow);
      window.addEventListener("resize", checkOverflow);
    }

    return () => {
      if (navElement) {
        navElement.removeEventListener("scroll", checkOverflow);
        window.removeEventListener("resize", checkOverflow);
      }
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (navRef.current) {
      const scrollAmount = navRef.current.clientWidth * 0.8;
      navRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* 1st Header */}
      <header className="w-full">
        <div className="h-13.5 flex justify-between w-full items-center gap-2 md:gap-4 px-6">
          <Link href="/admin/overview" className="flex items-center group">
            <span className="text-2xl font-semibold transition-colors duration-300 group-hover:text-primary">
              Weetoo
            </span>
            <span className="ml-2 text-sm font-normal text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              / admin
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* <div className="">
              <Input placeholder="Search..." className="w-full" type="search" />
            </div> */}
            <ThemeToggle />
            <AdminNotification />
            <AdminProfile />
          </div>
        </div>
      </header>

      {/* 2nd Header - Now Sticky */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative">
          {showLeftChevron && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-transparent via-background to-background backdrop-blur-sm p-1 rounded-r-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div
            ref={navRef}
            className="h-11.5 flex items-center border-b w-full overflow-x-scroll overflow-y-hidden gap-2 md:gap-4 px-4 scrollbar-none"
          >
            <AdminNav />
          </div>
          {showRightChevron && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-transparent via-background to-background backdrop-blur-sm p-1 rounded-l-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
