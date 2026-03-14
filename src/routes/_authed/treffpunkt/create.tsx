import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertCodeBlock,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { apiClient } from "@/api/client";
import type { ForumThreadType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authed/treffpunkt/create")({
  component: CreateThread,
});

interface ThreadFormData {
  title: string;
  type: ForumThreadType;
  body: string;
}

const THREAD_TYPES: ForumThreadType[] = [
  "question",
  "feature_request",
  "bug_report",
  "general",
];

function CreateThread() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bodyMarkdown, setBodyMarkdown] = useState("");

  const { register, handleSubmit, control } = useForm<ThreadFormData>({
    defaultValues: { title: "", type: "general", body: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ThreadFormData) => {
      const response = await apiClient.POST("/v1/forum/threads", {
        body: { title: data.title, type: data.type, body: bodyMarkdown },
      });
      if (response.error) throw new Error("Failed to create thread");
      return response.data.data;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["forum", "threads"] });
      navigate({ to: "/treffpunkt/$threadId", params: { threadId: thread.id } });
    },
  });

  return (
    <PageContent
      title={t("treffpunkt.newThread")}
      showBackButton
      backTo={() => navigate({ to: "/treffpunkt" })}
    >
      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="max-w-3xl space-y-6"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">{t("treffpunkt.threadTitle")} *</FieldLabel>
            <Input
              id="title"
              {...register("title", { required: true })}
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field className="max-w-56">
            <FieldLabel htmlFor="type">{t("treffpunkt.type")}</FieldLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THREAD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`treffpunkt.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </FieldGroup>

        <Field>
          <FieldLabel>{t("treffpunkt.body")}</FieldLabel>
          <div className="border rounded-md overflow-hidden">
            <MDXEditor
              markdown={bodyMarkdown}
              onChange={setBodyMarkdown}
              plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                tablePlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
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
                    </>
                  ),
                }),
              ]}
            />
          </div>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/treffpunkt" })}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
