"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

// Professional navigation items with dropdowns
const navigationItems = [
  {
    id: "trading",
    label: "Trading",
    href: "/trading",
    dropdown: [
      {
        label: "Live Trading",
        href: "/trading/live",
        description: "Real-time trading rooms",
      },
      {
        label: "KOR Coins",
        href: "/trading/kor-coins",
        description: "Virtual trading platform",
      },
      {
        label: "Rankings",
        href: "/trading/rankings",
        description: "Top traders leaderboard",
      },
      {
        label: "Sponsored",
        href: "/trading/sponsored",
        description: "Featured trading content",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    href: "/community",
    dropdown: [
      {
        label: "Free Board",
        href: "/board/free",
        description: "General discussions",
      },
      {
        label: "Education Board",
        href: "/board/education",
        description: "Learning resources",
      },
      {
        label: "Profit Board",
        href: "/board/profit",
        description: "Success stories",
      },
      {
        label: "Create Post",
        href: "/board/create",
        description: "Share your thoughts",
      },
    ],
  },
  {
    id: "information",
    label: "Information",
    href: "/information",
    dropdown: [
      { label: "News", href: "/news", description: "Latest market updates" },
      {
        label: "Comprehensive Data",
        href: "/comprehensive-data",
        description: "Market analytics",
      },
      {
        label: "Exchanges",
        href: "/exchanges",
        description: "Trading platforms",
      },
    ],
  },
  {
    id: "competition",
    label: "Competition",
    href: "/competition",
    dropdown: [
      {
        label: "Investment Competition",
        href: "/competition/investment",
        description: "Trading contests",
      },
      {
        label: "Leaderboards",
        href: "/competition/leaderboards",
        description: "Current standings",
      },
    ],
  },
];

// Clean GSAP Version with instant dropdown positioning
export function CustomNavigationMenu() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const handleNavItemHover = (itemId: string) => {
    setHoveredItem(itemId);
    setIsDropdownVisible(true);
  };

  const handleNavContainerLeave = () => {
    // Add a small delay to allow moving to dropdown
    setTimeout(() => {
      if (!navContainerRef.current?.matches(":hover")) {
        setHoveredItem(null);
        setIsDropdownVisible(false);
      }
    }, 100);
  };

  const handleDropdownLeave = () => {
    setHoveredItem(null);
    setIsDropdownVisible(false);
  };

  // Calculate dropdown position based on hovered item
  const getDropdownPosition = () => {
    if (!hoveredItem) return 120;
    const itemIndex = navigationItems.findIndex(
      (item) => item.id === hoveredItem
    );
    return itemIndex * 120 + 120;
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div
        ref={navContainerRef}
        className="relative bg-card shadow-xl border border-border rounded-xl px-8 py-4"
        onMouseLeave={handleNavContainerLeave}
      >
        <div className="flex items-center space-x-10">
          {/* Logo/Brand */}
          <div className="text-2xl font-bold text-foreground">Weetoo</div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => handleNavItemHover(item.id)}
              >
                <button
                  className={cn(
                    "px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300",
                    hoveredItem === item.id
                      ? "text-primary bg-accent shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4 ml-10">
            <button className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-300">
              Login
            </button>
            <button className="px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-md transition-all duration-300">
              Sign Up
            </button>
          </div>
        </div>

        {/* Clean Dropdown Menu with instant positioning */}
        {isDropdownVisible && (
          <div
            className="absolute top-full mt-4 w-72 bg-card rounded-xl shadow-2xl border border-border py-2 z-50"
            style={{ left: `${getDropdownPosition()}px` }}
            onMouseLeave={handleDropdownLeave}
          >
            {navigationItems
              .find((item) => item.id === hoveredItem)
              ?.dropdown?.map((dropdownItem, index) => (
                <a
                  key={dropdownItem.href}
                  href={dropdownItem.href}
                  className="block px-6 py-4 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 rounded-lg mx-2"
                >
                  <div className="font-medium">{dropdownItem.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dropdownItem.description}
                  </div>
                </a>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
