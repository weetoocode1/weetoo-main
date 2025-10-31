"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, UploadIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface StreamThumbnailProps {
  streamData?: {
    streamId?: string;
    playbackId?: string;
    status?: string;
    customThumbnailUrl?: string;
  };
}

export function StreamThumbnail({ streamData }: StreamThumbnailProps) {
  const t = useTranslations("stream.thumbnail");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    streamData?.customThumbnailUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStreamActive = streamData?.status === "active";
  const hasCustomThumbnail = !!streamData?.customThumbnailUrl;
  const isNewFileSelected = selectedFile !== null;

  const getMuxThumbnailUrl = () => {
    if (!streamData?.playbackId) return null;
    if (!isStreamActive) return null;
    return `https://image.mux.com/${streamData.playbackId}/thumbnail.webp?latest=true`;
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.onlyImages"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("errors.maxSize"));
      return;
    }

    setSelectedFile(file);
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);
  };

  const handleSaveThumbnail = async () => {
    if (!selectedFile || !streamData?.streamId) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("streamId", streamData.streamId);

      const response = await fetch("/api/streams/upload-thumbnail", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.url);
        setSelectedFile(null);
        toast.success(t("toasts.uploaded"));
      } else {
        toast.error(t("toasts.uploadFailed"));
      }
    } catch (_error) {
      toast.error(t("toasts.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(streamData?.customThumbnailUrl || null);
  };

  const handleRemoveThumbnail = async () => {
    if (!streamData?.streamId) return;

    try {
      const response = await fetch(
        `/api/streams/${streamData.streamId}/remove-thumbnail`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setPreviewUrl(null);
        toast.success(t("toasts.removed"));
      } else {
        toast.error(t("toasts.removeFailed"));
      }
    } catch (_error) {
      toast.error(t("toasts.removeFailed"));
    }
  };

  const muxThumbnailUrl = getMuxThumbnailUrl();
  const displayUrl = isNewFileSelected
    ? previewUrl
    : hasCustomThumbnail
    ? previewUrl
    : muxThumbnailUrl;

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Left Side - Thumbnail Preview */}
      <div className="flex-1 space-y-3 h-full flex flex-col">
        <div className="border border-border rounded-lg overflow-hidden bg-muted/10 relative h-[340px] lg:h-[435px]">
          {displayUrl ? (
            <>
              <Image
                src={displayUrl}
                alt={t("preview.alt")}
                fill
                className="object-cover"
                unoptimized
              />
              {hasCustomThumbnail && !isNewFileSelected && (
                <div className="absolute top-3 right-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 shadow-lg"
                    onClick={handleRemoveThumbnail}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <ImageIcon className="h-16 w-16 mb-4" />
              <p className="text-base font-medium mb-1">{t("preview.noThumb")}</p>
              <p className="text-sm text-center">
                {!isStreamActive ? t("preview.appearsWhenActive") : t("preview.uploadHint")}
              </p>
            </div>
          )}
        </div>

        {/* Upload Button Below Image */}
        <div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading || !streamData?.streamId}
          />

          {!isNewFileSelected ? (
            <Button
              onClick={handleFileSelect}
              disabled={!streamData?.streamId}
              className="w-full h-10"
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              {t("buttons.upload")}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleCancelUpload}
                disabled={isUploading}
                variant="outline"
                className="w-full h-10"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSaveThumbnail}
                disabled={isUploading}
                className="w-full h-10"
              >
                {isUploading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    {t("buttons.uploading")}
                  </>
                ) : (
                  t("buttons.save")
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Settings */}
      <div className="flex-1 flex flex-col gap-2">
        <div>
          <h3 className="text-base font-semibold mb-1">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Current Thumbnail Status */}
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("status.title")}</span>
            <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
              {hasCustomThumbnail
                ? t("status.customUpload")
                : isStreamActive
                ? t("status.autoGenerated")
                : t("status.notAvailable")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("status.source")}</span>
            <span className="text-xs font-medium">
              {hasCustomThumbnail
                ? t("status.yourUpload")
                : muxThumbnailUrl
                ? t("status.muxSource")
                : t("status.none")}
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="border border-border rounded-lg p-4 bg-muted/10">
          <div className="flex items-start gap-2 mb-3">
            <ImageIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-xs font-medium">{t("requirements.title")}</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("requirements.size")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("requirements.maxFileSize")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("requirements.formats")}</span>
            </li>
          </ul>
        </div>

        {/* Info Section */}
        {!hasCustomThumbnail && muxThumbnailUrl && (
          <div className="border border-border rounded-lg p-4 bg-primary/5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("tip.title")}</span> {t("tip.body")}
            </p>
          </div>
        )}

        {/* Actions for existing custom thumbnail */}
        {hasCustomThumbnail && !isNewFileSelected && (
          <div className="border border-border rounded-lg p-4 bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium">{t("active.title")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("active.body")}</p>
          </div>
        )}

        {/* Help Section */}
        <div className="border border-border rounded-lg p-4 bg-muted/10">
          <p className="text-xs font-medium mb-2">{t("best.title")}</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("best.tip1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("best.tip2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{t("best.tip3")}</span>
            </li>
          </ul>
        </div>

        {/* Status Info */}
        {!streamData?.streamId && (
          <div className="border border-amber-500/20 rounded-lg p-4 bg-amber-500/10">
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("notice.credentials")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
