"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface ImageUploaderProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
  carouselIndex: number;
  setCarouselIndex: (index: number) => void;
}

export function ImageUploader({
  images,
  setImages,
  setImageFiles,
  carouselIndex,
  setCarouselIndex,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArr = Array.from(files).slice(0, 4 - images.length);
    const readers = fileArr.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((base64s) => {
      setImages((prev) => [...prev, ...base64s].slice(0, 4));
      setImageFiles((prev) => [...prev, ...fileArr].slice(0, 4));
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove image
  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    if (carouselIndex >= images.length - 1 && carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
    }
  };

  return (
    <div className="mb-6">
      <Label className="mb-2 text-muted-foreground">
        Images <span className="font-normal text-xs">(up to 4)</span>
      </Label>
      <div className="flex gap-3 flex-wrap">
        {images.map((img, idx) => (
          <div key={idx} className="relative group">
            <img
              src={img}
              alt={`Upload ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-none border border-border shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/40"
              onClick={() => setCarouselIndex(idx)}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 p-1 shadow opacity-80 hover:opacity-100"
              onClick={() => handleRemoveImage(idx)}
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {images.length < 4 && (
          <Label className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-muted-foreground/40 rounded-none cursor-pointer hover:border-primary/60 transition-colors bg-muted/40">
            <span className="text-muted-foreground text-2xl">+</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
              aria-label="Add images"
            />
          </Label>
        )}
      </div>
    </div>
  );
}
