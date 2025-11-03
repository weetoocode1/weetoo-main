"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLiveViewers } from "@/hooks/use-live-viewers";
import MuxPlayer from "@mux/mux-player-react";
import {
  ActivityIcon,
  CheckIcon,
  Clock3Icon,
  EyeIcon,
  GaugeIcon,
  HeartIcon,
  ImageIcon,
  PencilIcon,
  SettingsIcon,
  VideoIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Donations } from "./donations";
// import { StreamAnalytics } from "./stream-analytics"; // Temporarily disabled
import { createClient } from "@/lib/supabase/client";
import { GuideBook } from "./guide-book";
import { StreamHealth } from "./stream-health";
import { StreamSettings } from "./stream-settings";
import { StreamTags } from "./stream-tags";
import { StreamThumbnail } from "./stream-thumbnail";

// Custom Tabs Component
interface CustomTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

function CustomTabs({ tabs, activeTab, onTabChange }: CustomTabsProps) {
  return (
    <div className="flex border-b border-border overflow-x-auto scrollbar-none">
      <div className="flex min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm sm:text-sm font-medium transition-colors border-b-2 cursor-pointer ${
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
    </div>
  );
}

interface StreamDashboardProps {
  streamData?: {
    streamId?: string;
    streamKey?: string;
    rtmpUrl?: string;
    playbackId?: string;
    latencyMode?: string;
    reconnectWindow?: number;
    enableDvr?: boolean;
    unlistReplay?: boolean;
    status?: string;
    startedAt?: string;
    customThumbnailUrl?: string;
  };
  roomId?: string;
}

export function StreamDashboard({ streamData, roomId }: StreamDashboardProps) {
  const t = useTranslations("stream.dashboard");
  const [activeTab, setActiveTab] = useState("settings");
  const [roomData, setRoomData] = useState<{
    name: string;
    description: string | null;
    tags: string[];
    creator_id?: string;
  } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = useRef(createClient());
  const [presenceCount, setPresenceCount] = useState(0);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      const errorString = String(firstArg || "");

      const isNonFatalHlsError =
        errorString.includes("getErrorFromHlsErrorData") ||
        errorString.includes("bufferStalledError") ||
        (typeof firstArg === "object" &&
          firstArg !== null &&
          "details" in firstArg &&
          (firstArg as { details?: string; fatal?: boolean }).details ===
            "bufferStalledError" &&
          (firstArg as { fatal?: boolean }).fatal === false);

      if (isNonFatalHlsError) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const fetchRoomData = async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/trading-rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoomData({
          name: data.name || "Untitled Room",
          description: data.description || null,
          tags: data.tags || [],
          creator_id: data.creator_id,
        });
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
    }
  };

  const handleEditTitle = () => {
    if (roomData) {
      setEditedTitle(roomData.name);
      setIsEditingTitle(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
    }
  };

  const handleEditDescription = () => {
    setEditedDescription(roomData?.description || "");
    setIsEditingDescription(true);
    setTimeout(() => {
      descriptionTextareaRef.current?.focus();
    }, 0);
  };

  const handleSaveTitle = async () => {
    if (!roomId || !editedTitle.trim()) return;

    try {
      const response = await fetch(`/api/trading-rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedTitle.trim() }),
      });

      if (response.ok) {
        setRoomData((prev) =>
          prev ? { ...prev, name: editedTitle.trim() } : null
        );
        setIsEditingTitle(false);
        toast.success(t("toasts.titleUpdated"));
      } else {
        toast.error(t("toasts.titleUpdateFailed"));
      }
    } catch (_error) {
      toast.error(t("toasts.titleUpdateFailed"));
    }
  };

  const handleSaveDescription = async () => {
    if (!roomId) return;

    const descriptionValue = editedDescription.trim() || null;

    try {
      const response = await fetch(`/api/trading-rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descriptionValue }),
      });

      if (response.ok) {
        setRoomData((prev) =>
          prev ? { ...prev, description: descriptionValue } : null
        );
        setIsEditingDescription(false);
        toast.success(t("toasts.descriptionUpdated"));
      } else {
        toast.error(t("toasts.descriptionUpdateFailed"));
      }
    } catch (_error) {
      toast.error(t("toasts.descriptionUpdateFailed"));
    }
  };

  const streamStatusConfig = {
    active: {
      label: "LIVE",
      dotColor: "bg-red-500",
      borderColor: "border-red-500/30",
      bgGradient: "from-red-500/10 to-red-600/5",
      textColor: "text-red-500",
      statusText: "Streaming Live",
      icon: WifiIcon,
      pulse: true,
      glow: true,
    },
    idle: {
      label: "IDLE",
      dotColor: "bg-yellow-500",
      borderColor: "border-yellow-500/30",
      bgGradient: "from-yellow-500/10 to-yellow-600/5",
      textColor: "text-yellow-500",
      statusText: "Stream Paused",
      icon: WifiIcon,
      pulse: false,
      glow: false,
    },
    ended: {
      label: "ENDED",
      dotColor: "bg-gray-500",
      borderColor: "border-gray-500/30",
      bgGradient: "from-gray-500/10 to-gray-600/5",
      textColor: "text-gray-500",
      statusText: "Stream Completed",
      icon: WifiOffIcon,
      pulse: false,
      glow: false,
    },
    disconnected: {
      label: "DISCONNECTED",
      dotColor: "bg-orange-500",
      borderColor: "border-orange-500/30",
      bgGradient: "from-orange-500/10 to-orange-600/5",
      textColor: "text-orange-500",
      statusText: "Stream Disconnected",
      icon: WifiOffIcon,
      pulse: false,
      glow: false,
    },
  };

  const status =
    (streamData?.status as keyof typeof streamStatusConfig) || "idle";
  const currentStatus = streamStatusConfig[status] || streamStatusConfig.idle;
  const StatusIcon = currentStatus.icon;
  const isOnline = streamData?.status === "active";

  const { isLoading: viewersLoading } = useLiveViewers(
    streamData?.streamId,
    isOnline
  );

  // Presence-based viewer count (fallback/primary shown in UI)
  useEffect(() => {
    if (!roomId) return;
    let channel: ReturnType<typeof supabase.current.channel> | null = null;
    let tracked = false;
    (async () => {
      try {
        const { data } = await supabase.current.auth.getUser();
        const uid =
          data?.user?.id || `host-${Math.random().toString(36).slice(2, 8)}`;
        channel = supabase.current.channel(`room-presence-${roomId}`, {
          config: { presence: { key: uid } },
        });
        channel
          .on("presence", { event: "sync" }, () => {
            try {
              const state = channel?.presenceState() || {};
              const total = Object.values(state).reduce(
                (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
                0
              );
              setPresenceCount(total);
            } catch {}
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && !tracked) {
              tracked = true;
              await channel!.track({ joined_at: new Date().toISOString() });
            }
          });
      } catch {}
    })();
    return () => {
      if (channel) supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  const latencyModeMap: Record<string, string> = {
    standard: "Normal",
    reduced: "Low",
    low: "Ultra Low",
  };

  const currentLatency = streamData?.latencyMode
    ? latencyModeMap[streamData.latencyMode] || "Unknown"
    : streamData?.streamId
    ? "Ultra Low"
    : "Unknown";

  const getElapsedTime = (): string => {
    if (!streamData?.startedAt || !isOnline) {
      return "Not streaming";
    }

    const startTime = new Date(streamData.startedAt).getTime();
    const now = Date.now();
    const diffMs = now - startTime;

    if (diffMs < 0) return "Not streaming";

    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const [elapsedTime, setElapsedTime] = useState(getElapsedTime());

  useEffect(() => {
    if (!streamData?.startedAt || !isOnline) {
      setElapsedTime("Not streaming");
      return;
    }

    const updateElapsed = () => setElapsedTime(getElapsedTime());
    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [streamData?.startedAt, isOnline]);

  const tabs = [
    {
      id: "settings",
      label: t("tabs.settings"),
      icon: <SettingsIcon className="h-4 w-4" />,
    },
    {
      id: "thumbnail",
      label: t("tabs.thumbnail"),
      icon: <ImageIcon className="h-4 w-4" />,
    },
    // {
    //   id: "analytics",
    //   label: t("tabs.analytics"),
    //   icon: <BarChart3Icon className="h-4 w-4" />,
    // },
    {
      id: "donations",
      label: t("tabs.donations"),
      icon: <HeartIcon className="h-4 w-4" />,
    },
    {
      id: "health",
      label: t("tabs.health"),
      icon: <ActivityIcon className="h-4 w-4" />,
    },
  ];

  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="border border-border flex items-center justify-between p-4 bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t("title")}
            </h2>
            <GuideBook />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Custom Status Badge */}
          <div
            className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              currentStatus.borderColor
            } bg-gradient-to-r ${
              currentStatus.bgGradient
            } backdrop-blur-sm transition-all duration-300 ${
              currentStatus.glow ? "shadow-lg shadow-red-500/20" : ""
            }`}
          >
            <span
              className={`relative flex h-2.5 w-2.5 ${
                currentStatus.pulse ? "animate-ping" : ""
              }`}
            >
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  currentStatus.dotColor
                } opacity-75 ${currentStatus.pulse ? "animate-ping" : ""}`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${currentStatus.dotColor}`}
              />
            </span>
            <span className={`font-bold text-xs ${currentStatus.textColor}`}>
              {currentStatus.label}
            </span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <StatusIcon
              className={`h-4 w-4 ${currentStatus.textColor} ${
                currentStatus.pulse ? "animate-pulse" : ""
              }`}
            />
            <span className={`text-sm font-medium ${currentStatus.textColor}`}>
              {currentStatus.statusText}
            </span>
          </div>
        </div>
      </div>

      <div className="py-2 flex flex-col lg:flex-row gap-2">
        <div className="aspect-video w-full lg:max-w-xl border border-border overflow-hidden">
          {streamData?.playbackId && isOnline ? (
            <MuxPlayer
              streamType="live"
              playbackId={streamData.playbackId}
              metadata={{
                video_title: roomData?.name || t("liveStream"),
                video_id: streamData.streamId,
              }}
              preferPlayback="mse"
              disableTracking
              style={{ height: "100%", width: "100%" }}
            />
          ) : (
            <div className="h-full grid place-content-center text-muted-foreground bg-muted/20">
              <div className="flex flex-col items-center gap-2">
                <VideoIcon className="h-8 w-8" />
                <span className="text-sm">
                  {isOnline ? t("waiting") : t("notActive")}
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Stream Info */}
        <div className="flex-1 min-w-0 border border-border text-card-foreground p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 pl-3 border-l-2 border-l-primary">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("streamTitle")}
              </div>
              {isEditingTitle ? (
                <div className="relative">
                  <Input
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle();
                      }
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditedTitle(roomData?.name || "");
                      }
                    }}
                    maxLength={100}
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      width: "100%",
                      maxWidth: "100%",
                    }}
                    className="border-0 border-b rounded-none px-0 py-1 text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary pr-8"
                  />
                  <div className="absolute right-1 top-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={handleSaveTitle}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {editedTitle.length}/100 {t("characters")}
                  </div>
                </div>
              ) : (
                <div className="text-base font-semibold leading-6">
                  {roomData?.name || t("loading")}
                </div>
              )}
            </div>
            {!isEditingTitle && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 hover:text-primary"
                onClick={handleEditTitle}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Separator className="my-3" />

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-muted-foreground">
                {t("descriptionOptional")}
              </div>
              {!isEditingDescription && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 hover:text-primary"
                  onClick={handleEditDescription}
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
              )}
            </div>

            {isEditingDescription ? (
              <div className="relative">
                <Textarea
                  ref={descriptionTextareaRef}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsEditingDescription(false);
                      setEditedDescription(roomData?.description || "");
                    }
                  }}
                  maxLength={500}
                  rows={2}
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    width: "100%",
                    maxWidth: "100%",
                    maxHeight: "50px",
                    overflowY: "auto",
                  }}
                  className="border-0 border-b rounded-none px-0 py-1 text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary pr-8 min-h-10"
                />
                <div className="absolute right-1 top-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleSaveDescription}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {editedDescription.length}/500 {t("characters")}
                </div>
              </div>
            ) : (
              <>
                {roomData?.description ? (
                  <p className="text-sm leading-relaxed">
                    {roomData.description}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    {t("noDescription")}
                  </p>
                )}
              </>
            )}
            <div className="mt-3">
              <div className="text-[10px] text-muted-foreground mb-2">
                {t("tagsLabel")}
              </div>
              <StreamTags
                tags={roomData?.tags || []}
                roomId={roomId}
                onTagsUpdate={(updatedTags) => {
                  setRoomData((prev) =>
                    prev ? { ...prev, tags: updatedTags } : null
                  );
                }}
              />
            </div>
          </div>

          <Separator className="my-3" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <EyeIcon className="h-4 w-4" />
                <span className="text-xs">{t("stats.viewers")}</span>
              </div>
              <span className="text-sm font-semibold">
                {viewersLoading && presenceCount === 0
                  ? "..."
                  : presenceCount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GaugeIcon className="h-4 w-4" />
                <span className="text-xs">{t("stats.latency")}</span>
              </div>
              <span className="text-sm font-medium">{currentLatency}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3Icon className="h-4 w-4" />
                <span className="text-xs">{t("stats.started")}</span>
              </div>
              <span className="text-sm font-medium">{elapsedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="border border-border flex flex-col h-full">
        <CustomTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "settings" && (
            <StreamSettings streamData={streamData} />
          )}
          {activeTab === "thumbnail" && (
            <StreamThumbnail streamData={streamData} />
          )}
          {/* {activeTab === "analytics" && (
            <StreamAnalytics
              streamId={streamData?.streamId}
              isOnline={isOnline}
            />
          )} */}
          {activeTab === "donations" && (
            <Donations
              roomId={roomId}
              creatorId={roomData?.creator_id}
              startedAt={streamData?.startedAt}
            />
          )}
          {activeTab === "health" && (
            <StreamHealth streamId={streamData?.streamId} isOnline={isOnline} />
          )}
        </div>
      </div>
    </div>
  );
}
