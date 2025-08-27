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
import { useLanguage } from "@/providers/language-provider";
import { ChevronDown, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

// Language Toggle Component for Mobile
function LanguageToggleMobile() {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    const newLocale = locale === "en" ? "ko" : "en";
    setLocale(newLocale);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 w-full py-2 text-sm font-medium text-left hover:bg-accent hover:text-accent-foreground rounded-md px-2 transition-colors"
    >
      <Globe className="h-4 w-4" />
      <span>{locale === "en" ? "한국어" : "English"}</span>
    </button>
  );
}

export function Menu() {
  const t = useTranslations("menu");
  // const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >({
    trading: false,
    leaderboard: false,
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

  // Menu items
  const community = [
    {
      title: t("freeBulletinBoard"),
      href: "/free-board",
      description: t("freeBulletinBoardDesc"),
    },
    {
      title: t("profitBulletinBoard"),
      href: "/profit-board",
      description: t("profitBulletinBoardDesc"),
    },
    {
      title: t("educationBulletinBoard"),
      href: "/education-board",
      description: t("educationBulletinBoardDesc"),
    },
  ];

  const information = [
    {
      title: t("comprehensiveData"),
      href: "/comprehensive-data",
      description: t("comprehensiveDataDesc"),
    },
    {
      title: t("news"),
      href: "/news",
      description: t("newsDesc"),
    },
  ];

  const broker = [
    {
      title: t("brokerComparison"),
      href: "/exchange",
      description: t("brokerComparisonDesc"),
    },
  ];

  const renderMobileMenu = () => (
    <div className="flex flex-col space-y-4">
      {/* Trading Section */}
      <Collapsible
        open={openSections.trading}
        onOpenChange={() => toggleSection("trading")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t("trading")}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              openSections.trading ? "transform rotate-180" : ""
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-2">
          <Link href="/trading" className="block py-2 text-sm">
            {t("startTrading")}
          </Link>
        </CollapsibleContent>
      </Collapsible>

      {/* Leaderboard Section */}
      <Collapsible
        open={openSections.leaderboard}
        onOpenChange={() => toggleSection("leaderboard")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t("leaderboard")}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              openSections.leaderboard ? "transform rotate-180" : ""
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-2">
          <Link href="/ranking" className="block py-2 text-sm">
            {t("winRate")}
          </Link>
          <Link href="/profit-rate" className="block py-2 text-sm">
            {t("profitRate")}
          </Link>
          {/* <Link href="/kor-coins" className="block py-2 text-sm">
            {t("korCoinsRankings")}
          </Link> */}
          <Link href="/most-activity" className="block py-2 text-sm">
            {t("mostActivity")}
          </Link>
          <Link href="/sponsored" className="block py-2 text-sm">
            {t("sponsored")}
          </Link>
          <Link href="/most-followed" className="block py-2 text-sm">
            {t("mostFollowed")}
          </Link>
        </CollapsibleContent>
      </Collapsible>

      {/* Community Section */}
      <Collapsible
        open={openSections.community}
        onOpenChange={() => toggleSection("community")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t("community")}
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
        {t("investmentCompetition")}
      </Link>

      {/* Information Section */}
      <Collapsible
        open={openSections.information}
        onOpenChange={() => toggleSection("information")}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          {t("information")}
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
        {t("broker")}
      </Link>

      {/* Language Toggle for Mobile */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <LanguageToggleMobile />
      </div>
    </div>
  );

  const renderDesktopMenu = () => (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t("trading")}</NavigationMenuTrigger>
          <NavigationMenuContent className="left-1/2 -translate-x-1/2">
            <ul className="grid p-2 w-[325px]">
              <ListItem href="/trading" title={t("startTrading")}>
                {t("startTradingDesc")}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>{t("leaderboard")}</NavigationMenuTrigger>
          <NavigationMenuContent className="left-1/2 -translate-x-1/2">
            <ul className="grid p-2 w-[325px]">
              <ListItem href="/ranking" title={t("winRate")}>
                {t("winRateDesc")}
              </ListItem>
              <ListItem href="/profit-rate" title={t("profitRate")}>
                {t("profitRateDesc")}
              </ListItem>
              {/* <ListItem href="/kor-coins" title={t("korCoinsRankings")}>
                {t("korCoinsRankingsDesc")}
              </ListItem> */}
              <ListItem href="/most-activity" title={t("mostActivity")}>
                {t("mostActivityDesc")}
              </ListItem>
              <ListItem href="/sponsored" title={t("sponsored")}>
                {t("sponsoredDesc")}
              </ListItem>
              <ListItem href="/most-followed" title={t("mostFollowed")}>
                {t("mostFollowedDesc")}
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>{t("community")}</NavigationMenuTrigger>
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
              {t("investmentCompetition")}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>{t("information")}</NavigationMenuTrigger>
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
              {t("broker")}
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
