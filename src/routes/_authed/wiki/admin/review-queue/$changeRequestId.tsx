import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  imagePlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { changeRequestByIdQueryOptions, changeRequestNotesQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WikiChangeRequestNote } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/admin/review-queue/$changeRequestId")({
  loader: ({ context: { queryClient }, params: { changeRequestId } }) => {
    queryClient.ensureQueryData(changeRequestByIdQueryOptions(changeRequestId));
    queryClient.ensureQueryData(changeRequestNotesQueryOptions(changeRequestId));
  },
  component: ReviewDetail,
});

interface NoteForm {
  body: string;
}

function ReviewDetail() {
  const { changeRequestId } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const { t, i18n } = useTranslation();
  const currentUserId = auth.session?.user.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = i18n.language.slice(0, 2);

  const crQuery = useQuery(changeRequestByIdQueryOptions(changeRequestId));
  const notesQuery = useQuery(changeRequestNotesQueryOptions(changeRequestId));
  const cr = crQuery.data;
  const notes = notesQuery.data?.result ?? [];

  const { register, handleSubmit, reset } = useForm<NoteForm>({ defaultValues: { body: "" } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wiki", "reviewQueue"] });
    queryClient.invalidateQueries({ queryKey: ["wiki", "changeRequests", changeRequestId] });
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/wiki/changeRequests/byId/{changeRequestId}/approve",
        { params: { path: { changeRequestId } }, body: {} },
      );
      if (response.error) throw new Error("Failed to approve");
    },
    onSuccess: () => { invalidate(); navigate({ to: "/wiki/admin/review-queue" }); },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/wiki/changeRequests/byId/{changeRequestId}/reject",
        { params: { path: { changeRequestId } }, body: {} },
      );
      if (response.error) throw new Error("Failed to reject");
    },
    onSuccess: () => { invalidate(); navigate({ to: "/wiki/admin/review-queue" }); },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST(
        "/v1/wiki/changeRequests/byId/{changeRequestId}/requestChanges",
        { params: { path: { changeRequestId } }, body: {} },
      );
      if (response.error) throw new Error("Failed to request changes");
    },
    onSuccess: () => { invalidate(); navigate({ to: "/wiki/admin/review-queue" }); },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: NoteForm) => {
      const response = await apiClient.POST(
        "/v1/wiki/changeRequests/byId/{changeRequestId}/notes",
        { params: { path: { changeRequestId } }, body: { body: data.body } },
      );
      if (response.error) throw new Error("Failed to add note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "changeRequests", changeRequestId, "notes"] });
      reset();
    },
  });

  if (!cr) return null;

  const isNewEntry = cr.type === "new_entry" || cr.entry === null;
  const isUnderReview = cr.status === "under_review";

  const pageTitle = cr.entry
    ? (cr.entry.translations.find((tr) => tr.locale === lang) ?? cr.entry.translations[0])?.title ?? cr.entry.id
    : t(`wiki.changeRequest.type.${cr.type}`);

  return (
    <PageContent
      title={pageTitle}
      showBackButton
      backTo={() => navigate({ to: "/wiki/admin/review-queue" })}
    >
      <div className="flex gap-2 mb-6 flex-wrap">
        <Badge variant="outline">{t(`wiki.changeRequest.type.${cr.type}`)}</Badge>
        <Badge variant="secondary">{t(`wiki.changeRequest.status.${cr.status}`)}</Badge>
        <span className="text-sm text-muted-foreground">{new Date(cr.createdAt as string).toLocaleDateString(i18n.language)}</span>
      </div>

      {/* Proposed content per locale */}
      <Tabs defaultValue="de" className="mb-8">
        <TabsList>
          {cr.translations.map((tr) => (
            <TabsTrigger key={tr.locale} value={tr.locale}>
              {tr.locale.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>
        {cr.translations.map((tr) => {
          if (isNewEntry) {
            return (
              <TabsContent key={tr.locale} value={tr.locale} className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{tr.title}</p>
                <div className="border rounded-md p-2 bg-green-50 dark:bg-green-950/20">
                  <MDXEditor
                    readOnly
                    markdown={tr.body}
                    plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), tablePlugin(), codeBlockPlugin({ defaultCodeBlockLanguage: "" }), imagePlugin()]}
                  />
                </div>
              </TabsContent>
            );
          }

          const currentBody = cr.entry!.translations.find((et) => et.locale === tr.locale)?.body ?? "";
          return (
            <TabsContent key={tr.locale} value={tr.locale} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Current</p>
                  <div className="border rounded-md p-2 bg-muted/30">
                    <MDXEditor
                      readOnly
                      markdown={currentBody}
                      plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), tablePlugin(), codeBlockPlugin({ defaultCodeBlockLanguage: "" }), imagePlugin()]}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Proposed — {tr.title}</p>
                  <div className="border rounded-md p-2 bg-green-50 dark:bg-green-950/20">
                    <MDXEditor
                      readOnly
                      markdown={tr.body}
                      plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), tablePlugin(), codeBlockPlugin({ defaultCodeBlockLanguage: "" }), imagePlugin()]}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Comments thread — visible and addable regardless of CR status */}
      <div className="mb-8 max-w-lg">
        <h3 className="text-sm font-semibold mb-3">{t("wiki.comments")}</h3>
        <div className="border rounded-lg max-w-lg overflow-hidden">
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
          <div className="p-3 border-t">
            <form onSubmit={handleSubmit((data) => addNoteMutation.mutate(data))} className="flex gap-2">
              <Input
                {...register("body", { required: true })}
                placeholder={t("wiki.commentBody")}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={addNoteMutation.isPending}>
                {t("wiki.addComment")}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Moderation actions — only when under_review */}
      {isUnderReview && (
        <div className="border rounded-lg p-4 max-w-lg">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending || requestChangesMutation.isPending}
            >
              {t("wiki.approve")}
            </Button>
            <Button
              variant="outline"
              onClick={() => requestChangesMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending || requestChangesMutation.isPending}
            >
              {t("wiki.requestChanges")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={approveMutation.isPending || rejectMutation.isPending || requestChangesMutation.isPending}
            >
              {t("wiki.reject")}
            </Button>
          </div>
        </div>
      )}
    </PageContent>
  );
}
