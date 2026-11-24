import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePublisher, insertImage$ } from "@mdxeditor/editor";
import { ImageUp, Loader2 } from "lucide-react";
import { processImageFile } from "@/lib/processImage";

// Toolbar button that uploads an image and inserts it at the cursor. Must be rendered inside
// MDXEditor's toolbar so it has access to the editor realm. The file is converted (HEIC),
// downscaled and compressed before onUpload, which returns the image's URL.
export function MarkdownImageUploadButton({
  onUpload,
}: {
  onUpload: (file: File) => Promise<string>;
}) {
  const { t } = useTranslation();
  const insertImage = usePublisher(insertImage$);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const processed = await processImageFile(file);
      const url = await onUpload(processed);
      insertImage({ src: url, altText: "" });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : t("common.imageUploadFailed"),
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <label
      title={t("common.uploadImage")}
      className="cursor-pointer flex items-center justify-center w-8 h-8 rounded hover:bg-accent"
    >
      <input
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        disabled={isUploading}
        onChange={handleFileChange}
      />
      {isUploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <ImageUp className="h-4 w-4" />
      )}
    </label>
  );
}
