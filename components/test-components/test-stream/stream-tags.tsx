"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { XIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface StreamTagsProps {
  tags: string[];
  roomId?: string;
  onTagsUpdate: (tags: string[]) => void;
}

export function StreamTags({ tags, roomId, onTagsUpdate }: StreamTagsProps) {
  const t = useTranslations("stream.tags");
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const MAX_TAGS = 5;

  const handleAddTag = async (skipBlur = false) => {
    const trimmedTag = newTag.trim();

    if (!trimmedTag) {
      setNewTag("");
      setIsAdding(false);
      return;
    }

    if (tags.length >= MAX_TAGS) {
      toast.error(t("errors.maxTags", { count: MAX_TAGS }));
      setIsAdding(false);
      return;
    }

    if (tags.includes(trimmedTag)) {
      if (!skipBlur) {
        toast.error(t("errors.duplicate"));
      }
      setNewTag("");
      setIsAdding(false);
      return;
    }

    const updatedTags = [...tags, trimmedTag];

    if (roomId) {
      try {
        const response = await fetch(`/api/trading-rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: updatedTags }),
        });

        if (response.ok) {
          onTagsUpdate(updatedTags);
          if (!skipBlur) {
            toast.success(t("toasts.added"));
          }
        } else {
          if (!skipBlur) {
            toast.error(t("toasts.addFailed"));
          }
        }
      } catch (_error) {
        if (!skipBlur) {
          toast.error(t("toasts.addFailed"));
        }
      }
    } else {
      onTagsUpdate(updatedTags);
    }

    setNewTag("");
    setIsAdding(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);

    if (roomId) {
      try {
        const response = await fetch(`/api/trading-rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: updatedTags }),
        });

        if (response.ok) {
          onTagsUpdate(updatedTags);
          toast.success(t("toasts.removed"));
        } else {
          toast.error(t("toasts.removeFailed"));
        }
      } catch (_error) {
        toast.error(t("toasts.removeFailed"));
      }
    } else {
      onTagsUpdate(updatedTags);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Escape") {
      setNewTag("");
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="px-2 py-0.5 text-[10px] uppercase tracking-wide group relative  rounded-none"
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="ml-0.5 inline-flex items-center justify-center rounded-none hover:bg-destructive transition-colors cursor-pointer"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {isAdding && tags.length < MAX_TAGS && (
        <Input
          autoFocus
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleAddTag(true)}
          placeholder={t("placeholder")}
          className="h-6 w-24 text-xs px-2 py-0.5 rounded-none"
        />
      )}

      {!isAdding && tags.length < MAX_TAGS && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 py-0 text-[10px] uppercase tracking-wide border-dashed rounded-none"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon className="h-3 w-3" />
          {t("add")}
        </Button>
      )}
    </div>
  );
}
