"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { animate } from "animejs";
import {
  ClockIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshCwIcon,
  ShieldIcon,
  ZapIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import React from "react";
import { useUpdateStream, useResetStreamKey } from "@/hooks/use-stream";

interface StreamSettingsProps {
  streamData?: {
    streamKey?: string;
    rtmpUrl?: string;
    backupRtmpUrl?: string;
    playbackId?: string;
    latencyMode?: string;
    reconnectWindow?: number;
    enableDvr?: boolean;
    unlistReplay?: boolean;
    streamId?: string;
  };
}

export function StreamSettings({ streamData }: StreamSettingsProps) {
  const t = useTranslations("stream.settings");
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] =
    useState(false);
  const lastResetTime = React.useRef<number>(0);

  const updateStream = useUpdateStream();
  const resetStreamKey = useResetStreamKey();

  const isSaving = updateStream.isPending;
  const isResetting = resetStreamKey.isPending;

  const dbToUiLatencyMap: Record<string, string> = {
    standard: "normal",
    reduced: "low",
    low: "ultra",
  };

  const [enableDVR, setEnableDVR] = useState(streamData?.enableDvr ?? true);
  const [unlistReplay, setUnlistReplay] = useState(
    streamData?.unlistReplay ?? false
  );
  const [selectedLatency, setSelectedLatency] = useState(
    streamData?.latencyMode
      ? dbToUiLatencyMap[streamData.latencyMode] || "ultra"
      : "ultra"
  );
  const [reconnectWindow, setReconnectWindow] = useState(
    streamData?.reconnectWindow || 60
  );

  const confirmReset = async () => {
    if (!streamData?.streamId) {
      toast.error(t("errors.streamIdNotFound"));
      return;
    }

    const now = Date.now();
    const timeSinceLastReset = now - lastResetTime.current;

    if (timeSinceLastReset < 5000) {
      toast.error(t("errors.waitBeforeReset"));
      setShowResetConfirm(false);
      return;
    }

    setShowResetConfirm(false);
    lastResetTime.current = now;

    resetStreamKey.mutate(streamData.streamId);
  };

  const saveSettings = async () => {
    if (!streamData?.streamId) {
      toast.error(t("errors.streamIdNotFound"));
      return;
    }

    const latencyModeMap: Record<string, string> = {
      normal: "standard",
      low: "reduced",
      ultra: "low",
    };

    const dbLatencyMode = latencyModeMap[selectedLatency] || "low";

    updateStream.mutate(
      {
        streamId: streamData.streamId,
        data: {
          latency_mode: dbLatencyMode,
          reconnect_window: reconnectWindow,
          enable_dvr: enableDVR,
          unlist_replay: unlistReplay,
        },
      },
      {
        onSuccess: (data) => {
          if (!data.warning) {
            toast.success(t("toasts.saved"));
          }
        },
        onError: (error) => {
          toast.error(error.message || t("toasts.saveFailed"));
        },
      }
    );
  };

  const resetSettingsToDefault = () => {
    setShowResetSettingsConfirm(false);
    setSelectedLatency("ultra");
    setReconnectWindow(60);
    setEnableDVR(true);
    setUnlistReplay(false);
  };

  const confirmResetSettings = async () => {
    if (!streamData?.streamId) {
      toast.error(t("errors.streamIdNotFound"));
      return;
    }

    resetSettingsToDefault();

    updateStream.mutate(
      {
        streamId: streamData.streamId,
        data: {
          latency_mode: "low",
          reconnect_window: 60,
          enable_dvr: true,
          unlist_replay: false,
        },
      },
      {
        onSuccess: (data) => {
          if (!data.warning) {
            toast.success(t("toasts.resetToDefault"));
          }
        },
        onError: (error) => {
          toast.error(error.message || t("toasts.resetFailed"));
        },
      }
    );
  };

  // Stream key handling: avoid demo placeholders; fetch securely if missing
  const [streamKey, setStreamKey] = useState<string>(
    streamData?.streamKey || ""
  );

  useEffect(() => {
    setStreamKey(streamData?.streamKey || "");
  }, [streamData?.streamKey]);

  useEffect(() => {
    const fetchKey = async () => {
      if (streamKey || !streamData?.streamId) return;
      try {
        const res = await fetch("/api/streams", {
          headers: { "Cache-Control": "no-store" },
        });
        if (!res.ok) return;
        const json = await res.json();
        const items = Array.isArray(json?.streams) ? json.streams : [];
        type StreamRow = { stream_id?: string; stream_key?: string };
        const rows = items as unknown as StreamRow[];
        const match = rows.find((s) => s.stream_id === streamData.streamId);
        if (match?.stream_key) setStreamKey(match.stream_key as string);
      } catch {}
    };
    fetchKey();
  }, [streamKey, streamData?.streamId]);
  const streamUrl =
    streamData?.rtmpUrl || "rtmp://global-live.mux.com:5222/app/";

  const reconnectOptions = [
    { value: 30, label: t("reconnect.options.30s") },
    { value: 60, label: t("reconnect.options.60s") },
    { value: 120, label: t("reconnect.options.2m") },
    { value: 300, label: t("reconnect.options.5m") },
  ];

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("toasts.copied", { label }));
    } catch (_error) {
      toast.error(t("toasts.copyFailed"));
    }
  };

  const animateCheckmark = (element: HTMLElement) => {
    // Reset the SVG path to initial state
    const path = element.querySelector("path");
    if (path) {
      const pathLength = path.getTotalLength();
      path.style.strokeDasharray = pathLength.toString();
      path.style.strokeDashoffset = pathLength.toString();
      path.style.fill = "none";
      path.style.stroke = "currentColor";
      path.style.strokeWidth = "2";
      path.style.strokeLinecap = "round";
      path.style.strokeLinejoin = "round";

      // Animate the path drawing
      animate(path, {
        strokeDashoffset: [pathLength, 0],
        duration: 400,
        ease: "out(3)",
        complete: () => {
          // After drawing, fill the checkmark
          animate(path, {
            fill: "currentColor",
            duration: 200,
            ease: "out(2)",
          });
        },
      });
    }
  };

  const handleToggle = (
    setter: (value: boolean) => void,
    currentValue: boolean,
    elementId: string
  ) => {
    setter(!currentValue);
    if (!currentValue) {
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          animateCheckmark(element);
        }
      }, 50);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Stream Connection */}
        <div className="bg-card rounded-lg p-4">
          <div className="mb-3">
            <h3 className="text-base font-medium text-foreground flex items-center gap-2">
              <ZapIcon className="h-4 w-4 text-primary" />
              {t("connection.title")}
            </h3>
          </div>
          <div className="space-y-3">
            {/* Stream Key Selection */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t("connection.streamKey")}
              </Label>
              <Select defaultValue="default">
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={t("connection.selectStreamKey")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {t("connection.defaultKey")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stream Key Display */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t("connection.streamKeyValue")}
              </Label>
              <div className="flex gap-1">
                <Input
                  value={
                    isStreamKeyVisible
                      ? streamKey || ""
                      : streamKey
                      ? "••••••••••••••••••••••••••••••••"
                      : ""
                  }
                  readOnly
                  className="font-mono text-xs bg-muted/50 border-border h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsStreamKeyVisible(!isStreamKeyVisible)}
                  className="h-8 w-8 p-0 border-border hover:bg-accent"
                >
                  {isStreamKeyVisible ? (
                    <EyeOffIcon className="h-3 w-3" />
                  ) : (
                    <EyeIcon className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  className="h-8 px-2 text-xs border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCwIcon
                    className={`h-3 w-3 mr-1 ${
                      isResetting ? "animate-spin" : ""
                    }`}
                  />
                  {isResetting
                    ? t("connection.resetting")
                    : t("connection.reset")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(streamKey, t("connection.streamKey"))
                  }
                  className="h-8 px-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <CopyIcon className="h-3 w-3 mr-1" />
                  {t("common.copy")}
                </Button>
              </div>
            </div>

            {/* Stream URL */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t("connection.primaryUrl")}
              </Label>
              <div className="flex gap-1">
                <Input
                  value={streamUrl}
                  readOnly
                  className="font-mono text-xs bg-muted/50 border-border h-8"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(streamUrl, t("connection.primaryUrlShort"))
                  }
                  className="h-8 px-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <CopyIcon className="h-3 w-3 mr-1" />
                  {t("common.copy")}
                </Button>
              </div>
            </div>

            <div className="py-3">
              {/* Stream Latency */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  {t("latency.title")}
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Normal Latency */}
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all duration-200 text-center min-h-[80px] ${
                      selectedLatency === "normal"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedLatency("normal")}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mb-3 ${
                        selectedLatency === "normal"
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedLatency === "normal" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <Label className="text-sm font-semibold text-foreground cursor-pointer mb-1">
                      {t("latency.normal")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("latency.normalDesc")}
                    </p>
                  </div>

                  {/* Low Latency */}
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all duration-200 text-center min-h-[80px] ${
                      selectedLatency === "low"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedLatency("low")}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mb-3 ${
                        selectedLatency === "low"
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedLatency === "low" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <Label className="text-sm font-semibold text-foreground cursor-pointer mb-1">
                      {t("latency.low")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("latency.lowDesc")}
                    </p>
                  </div>

                  {/* Ultra Low Latency */}
                  <div
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all duration-200 text-center min-h-[80px] ${
                      selectedLatency === "ultra"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedLatency("ultra")}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mb-3 ${
                        selectedLatency === "ultra"
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedLatency === "ultra" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <Label className="text-sm font-semibold text-foreground cursor-pointer mb-1">
                      {t("latency.ultra")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("latency.ultraDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stream Configuration */}
        <div className="bg-card rounded-lg p-4">
          <div className="space-y-3">
            {/* Stream Features */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">
                {t("features.title")}
              </h4>

              {/* Enable DVR */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                <div
                  className="space-y-0.5 cursor-pointer flex-1"
                  onClick={() =>
                    handleToggle(setEnableDVR, enableDVR, "dvr-checkmark")
                  }
                >
                  <Label className="text-sm font-medium text-foreground">
                    {t("features.enableDvr")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("features.enableDvrDesc")}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleToggle(setEnableDVR, enableDVR, "dvr-checkmark")
                  }
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    enableDVR
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  {enableDVR && (
                    <svg
                      id="dvr-checkmark"
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Unlist Replay */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                <div
                  className="space-y-0.5 cursor-pointer flex-1"
                  onClick={() =>
                    handleToggle(
                      setUnlistReplay,
                      unlistReplay,
                      "unlist-checkmark"
                    )
                  }
                >
                  <Label className="text-sm font-medium text-foreground">
                    {t("features.unlistReplay")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("features.unlistReplayDesc")}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleToggle(
                      setUnlistReplay,
                      unlistReplay,
                      "unlist-checkmark"
                    )
                  }
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    unlistReplay
                      ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  {unlistReplay && (
                    <svg
                      id="unlist-checkmark"
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Reconnect Window */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-primary" />
                    {t("reconnect.title")}
                  </Label>
                  {reconnectWindow === 60 && (
                    <Badge variant="secondary" className="text-xs">
                      {t("reconnect.recommended")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("reconnect.description")}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {reconnectOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setReconnectWindow(option.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer ${
                        reconnectWindow === option.value
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-muted/30 border-border/50 hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ShieldIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t("security.title")}
                  </h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    {t("security.body")}
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 flex gap-2">
              <Button
                onClick={() => setShowResetSettingsConfirm(true)}
                disabled={isSaving}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {t("buttons.resetDefault")}
              </Button>
              <Button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex-1"
                size="lg"
              >
                {isSaving ? t("buttons.saving") : t("buttons.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.resetKey.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.resetKey.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} disabled={isResetting}>
              {isResetting
                ? t("dialogs.resetKey.resetting")
                : t("dialogs.resetKey.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showResetSettingsConfirm}
        onOpenChange={setShowResetSettingsConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dialogs.resetSettings.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.resetSettings.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium">
              {t("dialogs.resetSettings.defaultLabel")}
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>{t("dialogs.resetSettings.defaults.latency")}</li>
              <li>{t("dialogs.resetSettings.defaults.reconnect")}</li>
              <li>{t("dialogs.resetSettings.defaults.enableDvr")}</li>
              <li>{t("dialogs.resetSettings.defaults.unlistReplay")}</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetSettings}
              disabled={isSaving}
            >
              {isSaving
                ? t("dialogs.resetSettings.resetting")
                : t("dialogs.resetSettings.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
