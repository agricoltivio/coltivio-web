import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { wikiEntryByIdQueryOptions } from "@/api/wiki.queries";
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
  codeMirrorPlugin,
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
import "@mdxeditor/editor/style.css";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LOCALES = ["de", "en", "it", "fr"] as const;
type Locale = (typeof LOCALES)[number];

interface ChangeRequestFormData {
  translations: { locale: Locale; title: string; body: string }[];
}

export const Route = createFileRoute("/_authed/wiki/my-entries/$entryId/change-request")({
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(wikiEntryByIdQueryOptions(entryId));
  },
  component: ChangeRequestForm,
});

function ChangeRequestForm() {
  const { entryId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const entryQuery = useQuery(wikiEntryByIdQueryOptions(entryId));
  const entry = entryQuery.data;

  const { register, handleSubmit, control } = useForm<ChangeRequestFormData>({
    defaultValues: {
      translations: LOCALES.map((locale) => {
        const existing = entry?.translations.find((tr) => tr.locale === locale);
        return { locale, title: existing?.title ?? "", body: existing?.body ?? "" };
      }),
    },
  });

  if (!entry) return null;

  const submitMutation = useMutation({
    mutationFn: async (data: ChangeRequestFormData) => {
      const response = await apiClient.POST("/v1/wiki/byId/{entryId}/changeRequest", {
        params: { path: { entryId } },
        body: { translations: data.translations },
      });
      if (response.error) throw new Error("Failed to submit change request");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "myChangeRequests"] });
      navigate({ to: "/wiki" });
    },
  });

  return (
    <PageContent
      title={t("wiki.propose")}
      showBackButton
      backTo={() => navigate({ to: "/wiki" })}
    >
      <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} className="max-w-3xl space-y-6">
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
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor={`cr-title-${locale}`}>{t("wiki.title_field")}</FieldLabel>
                  <Input
                    id={`cr-title-${locale}`}
                    type="text"
                    {...register(`translations.${idx}.title` as const)}
                  />
                </Field>
              </FieldGroup>
              <FieldGroup>
                <Field>
                  <FieldLabel>{t("wiki.body")}</FieldLabel>
                  <Controller
                    name={`translations.${idx}.body` as const}
                    control={control}
                    render={({ field }) => (
                      <div className="border rounded-md overflow-hidden">
                        <MDXEditor
                          key={locale}
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
                                </>
                              ),
                            }),
                          ]}
                        />
                      </div>
                    )}
                  />
                </Field>
              </FieldGroup>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/wiki" })}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitMutation.isPending}>
            {t("wiki.propose")}
          </Button>
        </div>
      </form>
    </PageContent>
  );
}
