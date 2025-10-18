"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock3Icon,
  EyeIcon,
  GaugeIcon,
  PencilIcon,
  TagIcon,
  VideoIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useState } from "react";

export function StreamDashboard() {
  const [isOnline] = useState(true); // flip to true to show LIVE state
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

      <div className="h-12 border-b border-border flex items-center px-3">
        <div>Stream Controls</div>
      </div>
    </div>
  );
}
