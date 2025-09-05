import {
  BanknoteIcon,
  Bell,
  Coins,
  CreditCard,
  FileText,
  LayoutDashboard,
  Link2,
  LucideIcon,
  MessageSquareText,
  TrendingUpIcon,
  Users2,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[]; // Optional: restrict to specific roles
};

export type AdminSection = {
  title: string;
  items: AdminNavItem[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    title: "General",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Notifications", href: "/admin/notification", icon: Bell },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Manage Posts", href: "/admin/manage-post", icon: FileText },
      {
        label: "User Management",
        href: "/admin/user-management",
        icon: Users2,
      },
      {
        label: "Admin Notes",
        href: "/admin/admin-notes",
        icon: MessageSquareText,
      },
      // {
      //   label: "Referral Codes",
      //   href: "/admin/referral-codes",
      //   icon: TicketIcon,
      // },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "UID Management", href: "/admin/uid-management", icon: Link2 },
      // {
      //   label: "Exchange UIDs",
      //   href: "/admin/exchange-uid",
      //   icon: MonitorPlay,
      // },
      { label: "KOR Coins", href: "/admin/kor-coins", icon: Coins },
      {
        label: "Rebate Management",
        href: "/admin/rebate-management",
        icon: TrendingUpIcon,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Bank Accounts",
        href: "/admin/bank-accounts",
        icon: BanknoteIcon,
        roles: ["super_admin"], // Only super_admin can see this
      },
      {
        label: "Deposits",
        href: "/admin/deposit-management",
        icon: CreditCard,
      },
      {
        label: "Withdrawals",
        href: "/admin/withdraw-management",
        icon: CreditCard,
      },
    ],
  },
  // {
  //   title: "System",
  //   items: [
  //     {
  //       label: "Admin Settings",
  //       href: "/admin/admin-settings",
  //       icon: Settings,
  //     },
  //   ],
  // },
];

/**
 * Get the page title for a given pathname
 * @param pathname - The current pathname
 * @returns The display title for the page
 */
export function getAdminPageTitle(pathname: string): string {
  // Find the matching navigation item
  for (const section of ADMIN_SECTIONS) {
    const matchingItem = section.items.find(
      (item: AdminNavItem) => item.href === pathname
    );
    if (matchingItem) {
      return matchingItem.label;
    }
  }

  // Fallback for root admin page
  if (pathname === "/admin") {
    return "Overview";
  }

  return "Admin";
}

/**
 * Check if a given pathname is an admin route
 * @param pathname - The pathname to check
 * @returns True if it's an admin route
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/**
 * Get the navigation item for a given pathname
 * @param pathname - The current pathname
 * @returns The navigation item or null if not found
 */
export function getAdminNavItem(pathname: string): AdminNavItem | null {
  for (const section of ADMIN_SECTIONS) {
    const matchingItem = section.items.find(
      (item: AdminNavItem) => item.href === pathname
    );
    if (matchingItem) {
      return matchingItem;
    }
  }
  return null;
}

/**
 * Get all available admin routes
 * @returns Array of all admin route paths
 */
export function getAllAdminRoutes(): string[] {
  return ADMIN_SECTIONS.flatMap((section) =>
    section.items.map((item) => item.href)
  );
}

/**
 * Get the section title for a given pathname
 * @param pathname - The current pathname
 * @returns The section title or null if not found
 */
export function getAdminSectionTitle(pathname: string): string | null {
  for (const section of ADMIN_SECTIONS) {
    const matchingItem = section.items.find(
      (item: AdminNavItem) => item.href === pathname
    );
    if (matchingItem) {
      return section.title;
    }
  }
  return null;
}
