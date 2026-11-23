import type { TFunction } from "i18next";
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  imagePlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertCodeBlock,
} from "@mdxeditor/editor";
import { apiClient } from "@/api/client";
import { ApiError } from "@/api/apiError";
import { MarkdownImageUploadButton } from "@/components/MarkdownImageUploadButton";
import { processImageFile } from "@/lib/processImage";

// Message for a failed forum request: specific for known error codes (treffpunkt.errors.<code>),
// otherwise the fallback
export function forumErrorMessage(
  error: unknown,
  fallback: string,
  t: TFunction,
): string {
  return error instanceof ApiError && error.code
    ? t(`treffpunkt.errors.${error.code}`, { defaultValue: fallback })
    : fallback;
}

// Uploads an already processed image. The API strips its metadata (GPS included), downscales and
// re-encodes it; the returned URL goes into the Markdown and saving the post links the image to it.
async function uploadForumImage(file: File, t: TFunction): Promise<string> {
  const response = await apiClient.POST("/v1/forum/images", {
    // The body is sent as multipart; the generated type only knows the field
    body: { file: "" },
    bodySerializer: () => {
      const formData = new FormData();
      formData.append("file", file);
      return formData;
    },
  });
  if (response.error) {
    throw new Error(
      forumErrorMessage(
        new ApiError(response.error.error, response.error.code),
        t("common.imageUploadFailed"),
        t,
      ),
    );
  }
  return response.data.data.url;
}

// Editor plugins for writing a thread or reply. Images come in through the toolbar button, paste and
// drag & drop, all uploaded to the API. No resizing and no image settings: those write HTML or let
// the user enter an external URL, which the API rejects.
export function forumWritePlugins(t: TFunction) {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
    imagePlugin({
      // Paste and drag & drop
      imageUploadHandler: async (image: File) => {
        try {
          return await uploadForumImage(await processImageFile(image), t);
        } catch (error) {
          alert(
            error instanceof Error
              ? error.message
              : t("common.imageUploadFailed"),
          );
          throw error;
        }
      },
      disableImageResize: true,
      disableImageSettingsButton: true,
    }),
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
          <MarkdownImageUploadButton
            onUpload={(file) => uploadForumImage(file, t)}
          />
        </>
      ),
    }),
  ];
}

// Read-only plugins for showing a thread or reply
export function forumReadPlugins() {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
    imagePlugin(),
  ];
}

// Clicking an image in a shown post opens it full size in a new tab
export function openClickedImage(event: React.MouseEvent<HTMLElement>) {
  if (event.target instanceof HTMLImageElement) {
    window.open(event.target.src, "_blank", "noopener,noreferrer");
  }
}
