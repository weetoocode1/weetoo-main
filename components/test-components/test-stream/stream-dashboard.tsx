"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StreamSettings } from "./stream-settings";
import { StreamAnalytics } from "./stream-analytics";
import { Donations } from "./donations";
import { StreamHealth } from "./stream-health";
import {
  Clock3Icon,
  EyeIcon,
  GaugeIcon,
  PencilIcon,
  TagIcon,
  VideoIcon,
  WifiIcon,
  WifiOffIcon,
  SettingsIcon,
  BarChart3Icon,
  HeartIcon,
  ActivityIcon,
} from "lucide-react";
import { useState } from "react";

// Custom Tabs Component
interface CustomTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function CustomTabs({ tabs, activeTab, onTabChange }: CustomTabsProps) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === tab.id
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StreamDashboard() {
  const [isOnline] = useState(true); // flip to true to show LIVE state
  const [activeTab, setActiveTab] = useState("settings");

  const tabs = [
    {
      id: "settings",
      label: "Stream Settings",
      icon: <SettingsIcon className="h-4 w-4" />,
    },
    {
      id: "analytics",
      label: "Stream Analytics",
      icon: <BarChart3Icon className="h-4 w-4" />,
    },
    {
      id: "donations",
      label: "Donations",
      icon: <HeartIcon className="h-4 w-4" />,
    },
    {
      id: "health",
      label: "Stream Health",
      icon: <ActivityIcon className="h-4 w-4" />,
    },
  ];
  return (
    <div className="flex-1 w-full h-full border flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span>Stream Dashboard</span>
          {isOnline && (
            <Badge variant="destructive" className="gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive-foreground"></span>
              LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <WifiIcon className="h-5 w-5 text-success" />
            ) : (
              <WifiOffIcon className="h-5 w-5 text-muted-foreground animate-pulse" />
            )}
            <span
              className={isOnline ? "text-success" : "text-muted-foreground"}
            >
              {isOnline ? "Currently Online" : "Currently Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="py-6 px-3 flex gap-3">
          <div className="aspect-video w-full max-w-xl border border-border grid place-content-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              <span>Preview</span>
            </div>
          </div>
          <div className="flex-1 border border-border text-card-foreground p-4">
            <div className="flex items-start justify-between">
              <div className="pl-3 border-l-2 border-l-primary">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Stream Title
                </div>
                <div className="text-base font-semibold leading-6">
                  My Awesome Trading Stream
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 hover:text-primary"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>

            <Separator className="my-3" />

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Description
              </div>
              <p className="text-sm leading-relaxed">
                Live market analysis, strategy breakdowns, and Q&A. Join in to
                discuss entries, exits, and risk management across BTC, ETH, and
                top alts.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                >
                  BTC
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                >
                  ETH
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
                >
                  Scalping
                </Badge>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <EyeIcon className="h-4 w-4" />
                  <span className="text-xs">Total Viewers</span>
                </div>
                <span className="text-sm font-semibold">1,248</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TagIcon className="h-4 w-4" />
                  <span className="text-xs">Category</span>
                </div>
                <span className="text-sm font-medium">Crypto & Finance</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GaugeIcon className="h-4 w-4" />
                  <span className="text-xs">Latency</span>
                </div>
                <span className="text-sm font-medium">Low</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock3Icon className="h-4 w-4" />
                  <span className="text-xs">Started</span>
                </div>
                <span className="text-sm font-medium">2m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tabs */}
      <CustomTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "settings" && <StreamSettings />}
        {activeTab === "analytics" && <StreamAnalytics />}
        {activeTab === "donations" && <Donations />}
        {activeTab === "health" && <StreamHealth />}
      </div>
    </div>
  );
}
