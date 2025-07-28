"use client";

import Link from "next/link";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const community: { title: string; href: string; description: string }[] = [
  {
    title: "Free Bulletin Board",
    href: "/free-board",
    description:
      "Open discussions about market trends, strategies, and general trading topics",
  },
  {
    title: "Profit Bulletin Board",
    href: "/profit-board",
    description:
      "Share profitable trades with verified results and proven strategies",
  },
  {
    title: "Education Bulletin Board",
    href: "/education-board",
    description:
      "Learn from expert tutorials, guides, and educational trading content",
  },
];

const information: { title: string; href: string; description: string }[] = [
  {
    title: "Comprehensive Data",
    href: "/comprehensive-data",
    description:
      "Access real-time market data, charts, analytics, and trading indicators",
  },
  {
    title: "News",
    href: "/news",
    description:
      "Stay updated with breaking crypto news, market analysis, and regulatory updates",
  },
];

const broker: { title: string; href: string; description: string }[] = [
  {
    title: "Coin Futures Exchange Comparison",
    href: "/coin-futures",
    description:
      "Compare Korean crypto exchanges - fees, features, security, and trading pairs",
  },

  // {
  //   title: "Overseas Futures Comparison",
  //   href: "/overseas-futures",
  //   description:
  //     "Compare international exchanges - regulations, leverage, and global trading options",
  // },
];

export function Menu() {
  // const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >({
    trading: false,
    community: false,
    information: false,
    broker: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderMobileMenu = () => (
    <div className="flex flex-col space-y-4">
      {/* Trading Section */}
      <Collapsible
        open={openSections.trading}
        onOpenChange={() => toggleSection("trading")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          Trading
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              openSections.trading ? "transform rotate-180" : ""
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-2">
          <Link href="/trading" className="block py-2 text-sm">
            Start Trading
          </Link>
          <Link href="/ranking" className="block py-2 text-sm">
            Trader Rankings
          </Link>
          <Link href="/kor-coins" className="block py-2 text-sm">
            Kor Coins Rankings
          </Link>
        </CollapsibleContent>
      </Collapsible>

      {/* Community Section */}
      <Collapsible
        open={openSections.community}
        onOpenChange={() => toggleSection("community")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          Community
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              openSections.community ? "transform rotate-180" : ""
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-2">
          {community.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="block py-2 text-sm"
            >
              {item.title}
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Investment Competition */}
      <Link href="/investment-competition" className="py-2 text-sm font-medium">
        Investment Competition
      </Link>

      {/* Information Section */}
      <Collapsible
        open={openSections.information}
        onOpenChange={() => toggleSection("information")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          Information
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              openSections.information ? "transform rotate-180" : ""
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-2">
          {information.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="block py-2 text-sm"
            >
              {item.title}
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Exchange Section */}
      <Link href={broker[0].href} className="py-2 text-sm font-medium">
        Broker
      </Link>
    </div>
  );

  const renderDesktopMenu = () => (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Trading</NavigationMenuTrigger>
          <NavigationMenuContent className="left-1/2 -translate-x-1/2">
            <ul className="grid gap-2 p-2 w-[300px]">
              <ListItem href="/trading" title="Start Trading">
                Begin live trading with real-time market data and advanced tools
              </ListItem>
              <ListItem href="/ranking" title="Trader Rankings">
                View top performing traders and their success rates
              </ListItem>
              <ListItem href="/kor-coins" title="Kor Coins Rankings">
                Track Korean cryptocurrency performance and market trends
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Community</NavigationMenuTrigger>
          <NavigationMenuContent className="left-1/2 -translate-x-1/2">
            <ul className="grid gap-2 p-2 w-[300px]">
              {community.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/investment-competition"
              className={navigationMenuTriggerStyle()}
            >
              Investment Competition
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Information</NavigationMenuTrigger>
          <NavigationMenuContent className="left-1/2 -translate-x-1/2">
            <ul className="w-[300px] p-2">
              {information.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href={broker[0].href}
              className={navigationMenuTriggerStyle()}
            >
              Broker
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );

  return (
    <>
      <div className="hidden md:block">{renderDesktopMenu()}</div>
      <div className="md:hidden">{renderMobileMenu()}</div>
    </>
  );
}

interface ListItemProps extends React.ComponentPropsWithoutRef<typeof Link> {
  title: string;
}

const ListItem = React.forwardRef<React.ElementRef<typeof Link>, ListItemProps>(
  ({ className, title, children, href, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            ref={ref}
            href={href}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="text-sm font-medium leading-none">{title}</div>
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";
