import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import {
  myChangeRequestsQueryOptions,
  myChangeRequestDraftNotesQueryOptions,
} from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WikiChangeRequestNote } from "@/api/types";

const LOCALES = ["de", "en", "it", "fr"] as const;
type Locale = (typeof LOCALES)[number];

interface DraftCrFormData {
  translations: { locale: Locale; title: string; body: string }[];
}

interface NoteForm {
  body: string;
}

export const Route = createFileRoute("/_authed/wiki/my-entries/change-request-drafts/$changeRequestId")({
  loader: ({ context: { queryClient }, params: { changeRequestId } }) => {
    queryClient.ensureQueryData(myChangeRequestsQueryOptions());
    queryClient.ensureQueryData(myChangeRequestDraftNotesQueryOptions(changeRequestId));
  },
  component: EditChangeRequestDraft,
});

function EditChangeRequestDraft() {
  const { changeRequestId } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentUserId = auth.session?.user.id;
  const queryClient = useQueryClient();
  const lang = i18n.language.slice(0, 2);

  const changeRequestsQuery = useQuery(myChangeRequestsQueryOptions());
  const notesQuery = useQuery(myChangeRequestDraftNotesQueryOptions(changeRequestId));
  const cr = changeRequestsQuery.data?.result.find((c) => c.id === changeRequestId);
  const notes = notesQuery.data?.result ?? [];

  // Editable when the user still needs to take action
  const isEditable = cr?.status === "draft" || cr?.status === "changes_requested";

  const { register, handleSubmit: handleSave, control, formState: { isDirty }, getValues } =
    useForm<DraftCrFormData>({
      values: cr
        ? {
            translations: LOCALES.map((locale) => {
              const existing = cr.translations.find((tr) => tr.locale === locale);
              return { locale, title: existing?.title ?? "", body: existing?.body ?? "" };
            }),
          }
        : {
            translations: LOCALES.map((locale) => ({ locale, title: "", body: "" })),
          },
    });

  const { register: registerNote, handleSubmit: handleNoteSubmit, reset: resetNote } =
    useForm<NoteForm>({ defaultValues: { body: "" } });

  const saveMutation = useMutation({
    mutationFn: async (data: DraftCrFormData) => {
      const response = await apiClient.PATCH(
        "/v1/wiki/myChangeRequestDrafts/byId/{changeRequestId}",
        {
          params: { path: { changeRequestId } },
          body: { translations: data.translations },
        },
      );
      if (response.error) throw new Error("Failed to save draft");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki", "myChangeRequests"] }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/wiki/myChangeRequestDrafts/byId/{changeRequestId}/submit",
        { params: { path: { changeRequestId } }, body: {} },
      );
      if (response.error) throw new Error("Failed to resubmit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "myChangeRequests"] });
      navigate({ to: "/wiki/my-submissions" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: NoteForm) => {
      const response = await apiClient.POST(
        "/v1/wiki/myChangeRequestDrafts/byId/{changeRequestId}/notes",
        { params: { path: { changeRequestId } }, body: { body: data.body } },
      );
      if (response.error) throw new Error("Failed to add note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["wiki", "myChangeRequestDrafts", changeRequestId, "notes"],
      });
      resetNote();
    },
  });

  async function handleSubmitClick() {
    if (!confirm(t("wiki.submitConfirm"))) return;
    // Implicitly save if the form has unsaved changes
    if (isDirty) {
      await saveMutation.mutateAsync(getValues());
    }
    submitMutation.mutate();
  }

  if (!cr) return null;

  const crTitle =
    cr.translations.find((tr) => tr.locale === lang)?.title ??
    cr.translations[0]?.title ??
    changeRequestId;

  return (
    <PageContent
      title={t("wiki.editSubmission")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/my-submissions" })}
    >
      <div className="flex gap-2 mb-6">
        <Badge variant="outline">{t(`wiki.changeRequest.type.${cr.type}`)}</Badge>
        <Badge variant="secondary">{t(`wiki.changeRequest.status.${cr.status}`)}</Badge>
        <span className="text-sm text-muted-foreground">{crTitle}</span>
      </div>

      <form onSubmit={handleSave((data) => saveMutation.mutate(data))} className="max-w-3xl space-y-6 mb-10">
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
                    readOnly={!isEditable}
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
                          readOnly={!isEditable}
                          markdown={field.value}
                          onChange={field.onChange}
                          plugins={[
                            headingsPlugin(),
                            listsPlugin(),
                            quotePlugin(),
                            thematicBreakPlugin(),
                            linkPlugin(),
                            ...(isEditable ? [linkDialogPlugin()] : []),
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
                            ...(isEditable ? [markdownShortcutPlugin()] : []),
                            ...(isEditable
                              ? [
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
                                ]
                              : []),
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
        {isEditable && (
          <div className="flex gap-3">
            <Button type="submit" variant="outline" disabled={saveMutation.isPending || !isDirty}>
              {t("common.save")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmitClick}
              disabled={submitMutation.isPending || saveMutation.isPending}
            >
              {t("wiki.submit")}
            </Button>
          </div>
        )}
      </form>

      {/* Comments thread */}
      <div className="max-w-lg">
        <h3 className="text-sm font-semibold mb-3">{t("wiki.comments")}</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted p-4 min-h-24">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("wiki.noComments")}</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((note: WikiChangeRequestNote) => {
                  const isMine = note.authorId === currentUserId;
                  return (
                    <li key={note.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-slate-700 text-slate-50 dark:bg-slate-600 rounded-br-sm" : "bg-background text-foreground rounded-bl-sm shadow-sm"}`}>
                        <p>{note.body}</p>
                        <p className={`text-xs mt-1 ${isMine ? "text-slate-300 text-right" : "text-muted-foreground"}`}>
                          {new Date(note.createdAt as string).toLocaleDateString(i18n.language)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {cr.status !== "approved" && cr.status !== "rejected" && (
            <div className="p-3 border-t">
              <form
                onSubmit={handleNoteSubmit((data) => addNoteMutation.mutate(data))}
                className="flex gap-2"
              >
                <Input
                  {...registerNote("body", { required: true })}
                  placeholder={t("wiki.commentBody")}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={addNoteMutation.isPending}>
                  {t("wiki.addComment")}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageContent>
  );
}
