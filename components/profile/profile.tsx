"use client";

import { IdentityVerificationButton } from "@/components/identity-verification-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheckIcon,
  Camera,
  Edit2,
  Save,
  X,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "@/components/ui/cropper";
import { Slider } from "@/components/ui/slider";

// Type definitions
interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  email?: string;
  avatar_url?: string;
  level?: number;
  exp?: number;
  kor_coins?: number;
  role?: string;
  mobile_number?: string;
  identity_verified?: boolean;
  identity_verified_at?: string;
  identity_verification_id?: string;
}

interface FormData {
  first_name: string;
  last_name: string;
  nickname: string;
}

// ===== Avatar Crop Types & Helpers =====
type Area = { x: number; y: number; width: number; height: number };

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = pixelCrop.width,
  outputHeight: number = pixelCrop.height
): Promise<Blob | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  } catch (error) {
    console.error("Error in getCroppedImg:", error);
    return null;
  }
}

export function Profile() {
  const { user, loading } = useAuth();
  const [, setForceUpdate] = useState(false);
  const t = useTranslations("profile");
  const queryClient = useQueryClient();

  // Edit state management
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    nickname: "",
  });
  // File upload & crop state
  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
      removeFile,
    },
  ] = useFileUpload({ accept: "image/*" });
  const previewUrl = files[0]?.preview || null;
  const fileId = files[0]?.id as string | undefined;
  const previousFileIdRef = useRef<string | undefined | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Initialize form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        nickname: user.nickname || "",
      });
    }
  }, [user]);

  // Listen for identity verification completion
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This will update the user.identity_verified status instantly
      // The useAuth hook will have updated the user data, so we just need to trigger a re-render
      // We can use a state variable to force re-render
      setForceUpdate((prev) => !prev);
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    return () =>
      window.removeEventListener("identity-verified", handleIdentityVerified);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        nickname: user.nickname || "",
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error(t("edit.firstNameRequired"));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          nickname: formData.nickname.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update the user data in the cache instead of reloading
      if (user?.id) {
        queryClient.setQueryData(
          ["user", user.id],
          (oldData: UserData | undefined) => {
            if (oldData) {
              return {
                ...oldData,
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                nickname: formData.nickname.trim() || null,
              };
            }
            return oldData;
          }
        );

        // Also update the general user query data
        queryClient.setQueryData(["user"], (oldData: UserData | undefined) => {
          if (oldData && oldData.id === user.id) {
            return {
              ...oldData,
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              nickname: formData.nickname.trim() || null,
            };
          }
          return oldData;
        });
      }

      toast.success(t("edit.profileUpdated"));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error ? error.message : t("edit.updateFailed")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyCroppedAvatar = async () => {
    if (!user?.id || !previewUrl || !fileId || !croppedAreaPixels) {
      return setIsDialogOpen(false);
    }
    try {
      setIsUploadingAvatar(true);
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to generate cropped image");

      const supabase = createClient();
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg" as const,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: versionedUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      queryClient.setQueryData(
        ["user", user.id],
        (oldData: UserData | undefined) => {
          if (oldData) return { ...oldData, avatar_url: versionedUrl };
          return oldData;
        }
      );
      queryClient.setQueryData(["user"], (oldData: UserData | undefined) => {
        if (oldData && oldData.id === user.id)
          return { ...oldData, avatar_url: versionedUrl };
        return oldData;
      });

      toast.success(t("edit.avatarUpdated"));
      setIsDialogOpen(false);
      removeFile(fileId);
      setCroppedAreaPixels(null);
      setZoom(1);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(t("edit.avatarUpdateFailed"));
      setIsDialogOpen(false);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Open crop dialog when a new file is selected
  useEffect(() => {
    if (fileId && fileId !== previousFileIdRef.current) {
      setIsDialogOpen(true);
      setCroppedAreaPixels(null);
      setZoom(1);
    }
    previousFileIdRef.current = fileId;
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="border-b flex flex-col lg:flex-row flex-shrink-0">
          {/* Avatar Section - Mobile: Full width, Desktop: Fixed width */}
          <div className="p-4 lg:border-r space-y-2 flex flex-col items-center lg:items-start">
            {/* Avatar image or fallback */}
            {loading ? (
              <Skeleton className="h-[150px] w-[150px] sm:h-[200px] sm:w-[200px] lg:h-[250px] lg:w-[250px] border" />
            ) : (
              <div
                className="relative group"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                data-dragging={isDragging || undefined}
              >
                <Avatar className="h-[150px] w-[150px] sm:h-[200px] sm:w-[200px] lg:h-[250px] lg:w-[250px] border rounded-none">
                  <AvatarImage
                    src={user?.avatar_url || ""}
                    alt={t("form.profilePictureAlt")}
                    className="rounded-none"
                  />
                  <AvatarFallback className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-400 rounded-none">
                    {(user?.first_name?.slice(0, 2) || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-none flex items-center justify-center">
                  <Button
                    onClick={openFileDialog}
                    disabled={isUploadingAvatar}
                    size="sm"
                    className="flex items-center gap-2 rounded-none"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("edit.uploading")}
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        {t("edit.changePhoto")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Hidden file input for uploader */}
            <input {...getInputProps()} className="hidden" />

            {/* Cropper Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="gap-0 p-0 sm:max-w-140 *:[button]:hidden">
                <DialogDescription className="sr-only">
                  {t("form.profilePictureAlt")}
                </DialogDescription>
                <DialogHeader className="contents space-y-0 text-left">
                  <DialogTitle className="flex items-center justify-between border-b p-4 text-base">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="-my-1 opacity-60"
                        onClick={() => setIsDialogOpen(false)}
                        aria-label={t("edit.cancel")}
                      >
                        <ArrowLeft aria-hidden="true" />
                      </Button>
                      <span>{t("edit.changePhoto")}</span>
                    </div>
                    <Button
                      className="-my-1"
                      onClick={handleApplyCroppedAvatar}
                      disabled={!previewUrl}
                      autoFocus
                    >
                      {t("edit.save")}
                    </Button>
                  </DialogTitle>
                </DialogHeader>
                {previewUrl && (
                  <Cropper
                    className="h-96 sm:h-120"
                    image={previewUrl}
                    zoom={zoom}
                    onCropChange={handleCropChange}
                    onZoomChange={setZoom}
                  >
                    <CropperDescription />
                    <CropperImage />
                    <CropperCropArea />
                  </Cropper>
                )}
                <DialogFooter className="border-t px-4 py-6">
                  <div className="mx-auto flex w-full max-w-80 items-center gap-4">
                    <ZoomOut
                      className="shrink-0 opacity-60"
                      size={16}
                      aria-hidden="true"
                    />
                    <Slider
                      defaultValue={[1]}
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.1}
                      onValueChange={(value) => setZoom(value[0])}
                      aria-label="Zoom slider"
                    />
                    <ZoomIn
                      className="shrink-0 opacity-60"
                      size={16}
                      aria-hidden="true"
                    />
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Verification Status */}
            {!loading && (
              <>
                {/* Verified Badge */}
                {user?.identity_verified && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-none w-full">
                    <BadgeCheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {t("form.identityVerified")}
                    </span>
                  </div>
                )}

                {/* Verification Needed Badge */}
                {!user?.identity_verified && (
                  <div className="w-full lg:w-auto">
                    <IdentityVerificationButton
                      isFormValid={true} // Always true in profile context
                      mobileNumber={user?.mobile_number || ""}
                      text={t("form.verificationNeeded")}
                      className="flex items-center justify-center gap-2 h-10 rounded-none text-primary border border-destructive bg-destructive hover:bg-destructive/90 w-full lg:w-auto"
                      onVerificationSuccess={(verificationData, userData) => {
                        toast.success(t("verification.successMessage"));
                        window.location.reload();
                      }}
                      onVerificationFailure={() => {
                        toast.error(t("verification.errorMessage"));
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form Section - Mobile: Full width, Desktop: Flexible */}
          <div className="p-4 w-full space-y-2">
            {/* Edit Controls */}
            {!loading && (
              <div className="flex justify-end mb-4">
                {!isEditing ? (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 rounded-none"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t("edit.editProfile")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 rounded-none"
                    >
                      <X className="w-4 h-4" />
                      {t("edit.cancel")}
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-none"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? t("edit.saving") : t("edit.save")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 w-full gap-2">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-semibold">
                  {t("form.firstName")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    id="first-name"
                    placeholder={t("form.firstNamePlaceholder")}
                    className="rounded-none h-10"
                    value={
                      isEditing ? formData.first_name : user?.first_name || ""
                    }
                    readOnly={!isEditing}
                    onChange={
                      isEditing
                        ? (e) => handleInputChange("first_name", e.target.value)
                        : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-semibold">
                  {t("form.lastName")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    id="last-name"
                    placeholder={t("form.lastNamePlaceholder")}
                    className="rounded-none h-10"
                    value={
                      isEditing ? formData.last_name : user?.last_name || ""
                    }
                    readOnly={!isEditing}
                    onChange={
                      isEditing
                        ? (e) => handleInputChange("last_name", e.target.value)
                        : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-semibold">
                  {t("form.nickname")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    id="nickname"
                    placeholder={t("form.nicknamePlaceholder")}
                    className="rounded-none h-10"
                    value={isEditing ? formData.nickname : user?.nickname || ""}
                    readOnly={!isEditing}
                    onChange={
                      isEditing
                        ? (e) => handleInputChange("nickname", e.target.value)
                        : undefined
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  {t("form.email")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    id="email"
                    placeholder={t("form.emailPlaceholder")}
                    className="rounded-none h-10"
                    value={user?.email || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  {t("form.phone")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t("form.phonePlaceholder")}
                    className="rounded-none h-10"
                    value={user?.mobile_number || ""}
                    readOnly
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
