import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AnimalJournalEntry, PlotJournalEntry } from "@/api/types";
import { processImageFile } from "@/lib/processImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, X } from "lucide-react";

export type JournalEntryFormData = {
  title: string;
  date: string;
  content: string;
};

type ExistingEntry =
  | Pick<AnimalJournalEntry, "title" | "date" | "content">
  | Pick<PlotJournalEntry, "title" | "date" | "content">;

type UploadedImage = { id: string; signedUrl: string };

export function JournalEntryForm({
  entry,
  existingImages = [],
  // Called immediately when a file is picked (edit mode). If undefined, files
  // are buffered and passed to onSubmit (create mode).
  onUploadImage,
  onDeleteImage,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: {
  entry?: ExistingEntry;
  existingImages?: UploadedImage[];
  onUploadImage?: (file: File) => Promise<void>;
  onDeleteImage?: (imageId: string) => Promise<void>;
  onSubmit: (data: JournalEntryFormData, pendingFiles: File[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending files only used in create mode (when onUploadImage is not provided)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [imageError, setImageError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<JournalEntryFormData>({
    defaultValues: entry
      ? {
          title: entry.title,
          date: entry.date.split("T")[0],
          content: entry.content ?? "",
        }
      : {
          title: "",
          date: new Date().toISOString().split("T")[0],
          content: "",
        },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFiles = Array.from(e.target.files ?? []);
    if (rawFiles.length === 0) return;
    // Reset input so the same file can be picked again
    e.target.value = "";
    setImageError(null);

    if (onUploadImage) {
      // Edit mode: process then upload each file immediately
      for (const raw of rawFiles) {
        const tempId = `uploading-${Date.now()}-${raw.name}`;
        setUploadingIds((prev) => new Set(prev).add(tempId));
        try {
          const processed = await processImageFile(raw);
          await onUploadImage(processed);
        } catch (err) {
          setImageError(err instanceof Error ? err.message : "Image upload failed");
        } finally {
          setUploadingIds((prev) => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
          });
        }
      }
    } else {
      // Create mode: process then buffer with object URL previews
      for (const raw of rawFiles) {
        try {
          const processed = await processImageFile(raw);
          const preview = URL.createObjectURL(processed);
          setPendingFiles((prev) => [...prev, processed]);
          setPendingPreviews((prev) => [...prev, preview]);
        } catch (err) {
          setImageError(err instanceof Error ? err.message : "Image processing failed");
        }
      }
    }
  }

  function removePending(index: number) {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeleteImage(imageId: string) {
    if (!onDeleteImage) return;
    setDeletingIds((prev) => new Set(prev).add(imageId));
    try {
      await onDeleteImage(imageId);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  }

  const isUploadingAny = uploadingIds.size > 0;

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data, pendingFiles))}
      className="space-y-4 max-w-lg"
    >
      <div className="space-y-1">
        <Label htmlFor="title">{t("common.title")} *</Label>
        <Input id="title" {...register("title", { required: true })} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date">{t("common.date")} *</Label>
        <Input
          id="date"
          type="date"
          {...register("date", { required: true })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="content">{t("journal.content")}</Label>
        <Textarea id="content" rows={5} {...register("content")} />
      </div>

      {/* Images section */}
      <div className="space-y-2">
        <Label>{t("journal.images")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {/* Existing uploaded images */}
          {existingImages.map((img) => (
            <div key={img.id} className="relative aspect-square">
              <img
                src={img.signedUrl}
                alt=""
                className="rounded-md object-cover w-full h-full"
              />
              {onDeleteImage && (
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={deletingIds.has(img.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 disabled:opacity-50"
                >
                  {deletingIds.has(img.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Pending (create mode) previews */}
          {pendingPreviews.map((src, i) => (
            <div key={src} className="relative aspect-square">
              <img
                src={src}
                alt=""
                className="rounded-md object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Uploading spinner placeholders (edit mode) */}
          {Array.from(uploadingIds).map((id) => (
            <div
              key={id}
              className="aspect-square rounded-md border-2 border-dashed flex items-center justify-center"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ))}

          {/* Add image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAny}
            className="aspect-square rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        {imageError && (
          <p className="text-sm text-destructive">{imageError}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploadingAny}>
          {entry ? t("common.save") : t("common.create")}
        </Button>
      </div>
    </form>
  );
}
