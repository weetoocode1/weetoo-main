"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ImageUploader } from "./image-uploader";
import { PostPreview } from "./post-preview";
import { RichTextEditor } from "./rich-text-editor";

export function CreatePostForm({ board }: { board?: string }) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [, setSuccess] = useState(false);

  // Tag add/remove
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Form actions
  const handlePublish = async () => {
    console.log("handlePublish called, setting loading to true");
    setLoading(true);
    setError(null);

    // Validation before async operations
    if (!title || !content || !board) {
      setLoading(false);
      toast.error("Please fill in all required fields");
      return;
    }

    const imageUrls: string[] = [];
    try {
      console.log("Starting image upload process");
      if (imageFiles.length > 0) {
        const supabase = createClient();
        for (const file of imageFiles) {
          const { data, error } = await supabase.storage
            .from("post-images")
            .upload(`public/${Date.now()}-${file.name}`, file, {
              upsert: true,
            });
          if (error) {
            console.log("Image upload failed, setting loading to false");
            setLoading(false);
            toast.error("Image upload failed: " + error.message);
            return;
          }
          const url = supabase.storage
            .from("post-images")
            .getPublicUrl(data.path).data.publicUrl;
          imageUrls.push(url);
        }
      }

      console.log("Starting post creation API call");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          board,
          images: imageUrls,
          tags,
          excerpt: content.slice(0, 120),
        }),
      });

      console.log("API call completed, processing response");
      if (res.ok) {
        setSuccess(true);
        toast.success("Post published successfully!");
        // Optionally reset form or redirect
        setTitle("");
        setTags([]);
        setTagInput("");
        setContent("");
        setEditorKey((k) => k + 1);
        setImages([]);
        setImageFiles([]);
        setCarouselIndex(0);
        // Remove draft from localStorage if exists
        if (board) localStorage.removeItem(`draft-${board}`);
      } else {
        const { error } = await res.json();
        toast.error(error || "Failed to create post");
      }
    } catch (err: unknown) {
      console.log("Error occurred, setting loading to false");
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      console.log("Finally block: setting loading to false");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setTags([]);
    setTagInput("");
    setContent("");
    setImages([]);
    setImageFiles([]);
    setCarouselIndex(0);
  };

  // Helper for board label
  const boardLabel = board ? (
    <div className="mb-3">
      <span className="inline-block rounded-none bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {board.charAt(0).toUpperCase() + board.slice(1)} Board
      </span>
    </div>
  ) : null;

  return (
    <>
      {/* Mobile: Tabs for Create and Preview */}
      <div className="block md:hidden w-full">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="w-full bg-transparent flex gap-1 mb-2 mt-3">
            <TabsTrigger
              value="create"
              className="flex-1 rounded-none py-2 px-2 text-base font-semibold data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              Create
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="flex-1 rounded-none py-2 px-2 text-base font-semibold data-[state=active]:bg-muted data-[state=active]:shadow-none"
            >
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="create"
            className="w-full min-h-[100dvh] flex flex-col pb-6 px-3"
          >
            <div className="flex-1 flex flex-col bg-card border border-border rounded-none shadow-lg p-4 sm:p-6">
              {boardLabel}
              {/* Title */}
              <div className="mb-4">
                <Label htmlFor="title" className="mb-2 text-muted-foreground">
                  Post Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="text-base bg-muted/60 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 rounded-none"
                />
              </div>
              {/* Images */}
              <ImageUploader
                images={images}
                setImages={setImages}
                setImageFiles={setImageFiles}
                carouselIndex={carouselIndex}
                setCarouselIndex={setCarouselIndex}
              />
              {/* Tags */}
              <div className="mb-4">
                <Label className="mb-2 text-muted-foreground">Tags</Label>
                <Input
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="text-base bg-muted/60 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 rounded-none"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="pr-1.5 pl-3 py-1 text-xs flex items-center gap-1 bg-accent text-accent-foreground border border-accent/40"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-1 text-muted-foreground hover:text-destructive focus:outline-none p-0 h-4 w-4"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Content */}
              <div className="mb-6">
                <Label htmlFor="content" className="mb-2 text-muted-foreground">
                  Content
                </Label>
                <RichTextEditor key={editorKey} onChange={setContent} />
              </div>
              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4">
                <Button
                  type="button"
                  onClick={handlePublish}
                  className="font-semibold px-6 w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="font-semibold px-6 w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="preview"
            className="w-full min-h-[100dvh] flex flex-col pt-6 pb-6 px-3"
          >
            <div className="flex-1 flex flex-col">
              <PostPreview
                title={title}
                content={content}
                tags={tags}
                images={images}
                carouselIndex={carouselIndex}
                setCarouselIndex={setCarouselIndex}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex min-h-[calc(100vh-80px)] flex-row gap-2 container mx-auto pt-5">
        {/* Form Card */}
        <div className="w-full md:w-1/2 flex flex-col bg-card border border-border rounded-none shadow-lg p-8 mx-auto md:mx-0">
          {boardLabel}
          {/* Title */}
          <div className="mb-6">
            <Label htmlFor="title" className="mb-2 text-muted-foreground">
              Post Title
            </Label>
            <Input
              id="title"
              placeholder="Enter post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="text-base bg-muted/60 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 rounded-none"
            />
          </div>
          {/* Images */}
          <ImageUploader
            images={images}
            setImages={setImages}
            setImageFiles={setImageFiles}
            carouselIndex={carouselIndex}
            setCarouselIndex={setCarouselIndex}
          />
          {/* Tags */}
          <div className="mb-6">
            <Label className="mb-2 text-muted-foreground">Tags</Label>
            <Input
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="text-base bg-muted/60 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 rounded-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="pr-1.5 pl-3 py-1 text-xs flex items-center gap-1 bg-accent text-accent-foreground border border-accent/40"
                >
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-1 text-muted-foreground hover:text-destructive focus:outline-none p-0 h-4 w-4"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
          {/* Content */}
          <Label htmlFor="content" className="mb-2 text-muted-foreground">
            Content
          </Label>
          <RichTextEditor key={editorKey} onChange={setContent} />
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-auto justify-end">
            <Button
              type="button"
              onClick={handlePublish}
              className="font-semibold px-6 w-full sm:w-auto rounded-none"
              disabled={loading}
            >
              {loading ? "Publishing..." : "Publish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="font-semibold px-6 w-full sm:w-auto rounded-none"
            >
              Cancel
            </Button>
          </div>
        </div>
        {/* Preview */}
        <PostPreview
          title={title}
          content={content}
          tags={tags}
          images={images}
          carouselIndex={carouselIndex}
          setCarouselIndex={setCarouselIndex}
        />
      </div>
    </>
  );
}
