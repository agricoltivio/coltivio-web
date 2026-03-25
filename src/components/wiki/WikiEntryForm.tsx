import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ImageUp, Loader2 } from "lucide-react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  InsertTable,
  codeBlockPlugin,
  codeMirrorPlugin,
  InsertCodeBlock,
  imagePlugin,
  usePublisher,
  insertImage$,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wikiCategoriesQueryOptions, wikiTagsQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import type { WikiEntry, WikiCategory, WikiTag } from "@/api/types";

const LOCALES = ["de", "en", "it", "fr"] as const;
type Locale = (typeof LOCALES)[number];

// Must be rendered inside MDXEditor's toolbar so it has access to the editor realm
function ImageUploadButton({ onUpload }: { onUpload: (file: File) => Promise<string> }) {
  const insertImage = usePublisher(insertImage$);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB");
      e.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      insertImage({ src: url, altText: "" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <label
      title="Upload image"
      className="cursor-pointer flex items-center justify-center w-8 h-8 rounded hover:bg-accent"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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

function resizeImageFile(file: File, maxDimension: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      // Pass through unchanged if already within bounds
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      const scale = Math.min(maxDimension / width, maxDimension / height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

export interface WikiEntryFormData {
  // Pre-generated UUID so images can be uploaded before the entry is saved
  entryId: string;
  categoryId: string;
  tagIds: string[];
  translations: {
    locale: Locale;
    title: string;
    body: string;
  }[];
}

export interface WikiEntryFormProps {
  entry?: WikiEntry;
  onSubmit: (data: WikiEntryFormData) => void;
  isSubmitting?: boolean;
}

export function WikiEntryForm({ entry, onSubmit, isSubmitting = false }: WikiEntryFormProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.slice(0, 2);
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState("");

  const categoriesQuery = useQuery(wikiCategoriesQueryOptions());
  const tagsQuery = useQuery(wikiTagsQueryOptions());

  const categories = categoriesQuery.data?.result ?? [];
  const allTags = tagsQuery.data?.result ?? [];

  const defaultTranslations = LOCALES.map((locale) => {
    const existing = entry?.translations.find((tr) => tr.locale === locale);
    return { locale, title: existing?.title ?? "", body: existing?.body ?? "" };
  });

  // Use the existing entry ID or pre-generate one so images can be uploaded before save
  const entryId = entry?.id ?? crypto.randomUUID();

  const { register, handleSubmit, control, watch, setValue } = useForm<WikiEntryFormData>({
    defaultValues: {
      entryId,
      categoryId: entry?.categoryId ?? "",
      tagIds: entry?.tags.map((t) => t.tagId) ?? [],
      translations: defaultTranslations,
    },
  });

  async function handleImageUpload(file: File): Promise<string> {
    // Resize and convert to JPEG before upload (handles HEIC and oversized images)
    const resized = await resizeImageFile(file, 1200);

    // Step 1: get a short-lived signed upload URL from the API
    const signedUrlRes = await apiClient.POST("/v1/wiki/images/signedUrl", {
      body: { entryId, filename: resized.name },
    });
    if (signedUrlRes.error) throw new Error("Failed to get signed URL");
    const { signedUrl, path } = signedUrlRes.data.data;

    // Step 2: upload the file binary directly to Supabase Storage
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      body: resized,
      headers: { "Content-Type": resized.type },
    });
    if (!uploadRes.ok) throw new Error("Image upload failed");

    // Step 3: register the stored path and get back the public URL
    const registerRes = await apiClient.POST("/v1/wiki/images", {
      body: { entryId, storagePath: path },
    });
    if (registerRes.error) throw new Error("Failed to register image");
    return registerRes.data.data.publicUrl;
  }

  const tagIds = watch("tagIds");

  // Create a new tag on the fly and add its id to the selection
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const response = await apiClient.POST("/v1/wiki/tags", {
        body: { name, slug },
      });
      if (response.error) throw new Error("Failed to create tag");
      return response.data.data;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "tags"] });
      setValue("tagIds", [...tagIds, newTag.id]);
      setNewTagName("");
    },
  });

  function toggleTag(tagId: string) {
    if (tagIds.includes(tagId)) {
      setValue("tagIds", tagIds.filter((id) => id !== tagId));
    } else {
      setValue("tagIds", [...tagIds, tagId]);
    }
  }

  function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    const existing = allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!tagIds.includes(existing.id)) {
        setValue("tagIds", [...tagIds, existing.id]);
      }
      setNewTagName("");
    } else {
      createTagMutation.mutate(name);
    }
  }

  // Resolve category name for display using current i18n language
  function getCategoryName(category: WikiCategory) {
    return category.translations.find((tr) => tr.locale === lang)?.name ?? category.slug;
  }

  function getTagById(id: string): WikiTag | undefined {
    return allTags.find((tag) => tag.id === id);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      {/* Category */}
      <FieldGroup>
        <Field className="max-w-56">
          <FieldLabel htmlFor="categoryId">{t("wiki.category")} *</FieldLabel>
          <Controller
            name="categoryId"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCategoryName(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      {/* Tags */}
      <FieldGroup>
        <Field>
          <FieldLabel>{t("wiki.tags")}</FieldLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {allTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={tagIds.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <Input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
              placeholder={t("wiki.newTag")}
              className="max-w-48"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={createTagMutation.isPending}
            >
              {t("wiki.addTag")}
            </Button>
          </div>
          {/* Selected tags summary */}
          {tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tagIds.map((id) => {
                const tag = getTagById(id);
                return tag ? (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {tag.name}
                    <button type="button" onClick={() => toggleTag(id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </Field>
      </FieldGroup>

      {/* Translations — one tab per locale */}
      <div>
        <p className="text-sm font-medium mb-2">{t("wiki.translations")}</p>
        <Tabs defaultValue="de">
          <TabsList>
            {LOCALES.map((locale) => (
              <TabsTrigger key={locale} value={locale}>
                {locale.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          {LOCALES.map((locale, idx) => (
            <TabsContent key={locale} value={locale} className="mt-4 space-y-4">
              <Field>
                <FieldLabel htmlFor={`title-${locale}`}>{t("wiki.title_field")}</FieldLabel>
                <Input
                  id={`title-${locale}`}
                  type="text"
                  {...register(`translations.${idx}.title` as const)}
                />
              </Field>
              <Field>
                <FieldLabel>{t("wiki.body")}</FieldLabel>
                <Controller
                  name={`translations.${idx}.body` as const}
                  control={control}
                  render={({ field }) => (
                    <div className="border rounded-md overflow-hidden">
                      <MDXEditor
                        key={`${locale}-${entry?.id ?? "new"}`}
                        markdown={field.value}
                        onChange={field.onChange}
                        plugins={[
                          headingsPlugin(),
                          listsPlugin(),
                          quotePlugin(),
                          thematicBreakPlugin(),
                          linkPlugin(),
                          linkDialogPlugin(),
                          tablePlugin(),
                          codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
                          codeMirrorPlugin({
                            codeBlockLanguages: {
                              "": "Plain",
                              js: "JavaScript",
                              ts: "TypeScript",
                              py: "Python",
                              bash: "Bash",
                            },
                          }),
                          imagePlugin(),
                          markdownShortcutPlugin(),
                          toolbarPlugin({
                            toolbarContents: () => (
                              <>
                                <UndoRedo />
                                <BoldItalicUnderlineToggles />
                                <BlockTypeSelect />
                                <CreateLink />
                                <InsertTable />
                                <InsertCodeBlock />
                                <ImageUploadButton onUpload={handleImageUpload} />
                              </>
                            ),
                          }),
                        ]}
                      />
                    </div>
                  )}
                />
              </Field>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
