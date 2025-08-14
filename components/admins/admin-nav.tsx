"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Overview", path: "/admin/overview" },
  { name: "Notifications", path: "/admin/notifications" },
  { name: "User Management", path: "/admin/user-management" },
  { name: "Activity Log", path: "/admin/activity-log" },
  { name: "Livekit Management", path: "/admin/livekit-management" },
  // { name: "Kor Coins", path: "/admin/kor-coins" },
  { name: "Deposit Management", path: "/admin/deposit-management" },
  { name: "Withdraw Management", path: "/admin/withdraw-management" },
  { name: "Activity Points", path: "/admin/activity-points" },
  { name: "Usage History", path: "/admin/usage-history" },
  { name: "UID Management", path: "/admin/uid-management" },
  { name: "Exchange UID", path: "/admin/exchange-uid" },
  { name: "Manage Posts", path: "/admin/manage-posts" },
  { name: "Admin Notes", path: "/admin/admin-notes" },
  { name: "Admin Settings", path: "/admin/admin-settings" },
];

export function AdminNav() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const initialIndex = tabs.findIndex((tab) => tab.path === pathname);
  const [activeIndex, setActiveIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0
  );
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({ left: "6px", width: "0px" });
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Update active index when pathname changes
    const currentIndex = tabs.findIndex((tab) => tab.path === pathname);
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [pathname]);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useEffect(() => {
    // Update active style when activeIndex changes
    const activeElement = tabRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }
  }, [activeIndex]);

  return (
    <div className="relative flex items-center gap-0.5">
      {/* Hover Highlight */}
      <div
        className="absolute h-[32px] transition-all duration-300 ease-out bg-[#0e0f1114] dark:bg-[#ffffff1a] rounded-[6px] flex items-center"
        style={{
          ...hoverStyle,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
      />

      {/* Active Indicator */}
      <div
        className="absolute bottom-[-8.5px] h-[2px] bg-[#0e0f11] dark:bg-white transition-all duration-300 ease-out"
        style={activeStyle}
      />

      {/* Tabs */}
      <div className="relative flex items-center overflow-x-auto w-full">
        {tabs.map((tab, index) => (
          <Link key={index} href={tab.path} className="no-underline">
            <div
              ref={(el) => {
                if (el) tabRefs.current[index] = el;
              }}
              className={`px-3 py-2 cursor-pointer transition-colors duration-300 h-[30px] ${
                index === hoveredIndex || pathname === tab.path
                  ? "text-[#0e0e10] dark:text-white"
                  : "text-[#0e0f1199] dark:text-[#ffffff99]"
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="text-sm font-[var(--www-mattmannucci-me-geist-regular-font-family)] leading-5 whitespace-nowrap flex items-center justify-center h-full">
                {tab.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
