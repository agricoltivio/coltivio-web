import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import {
  MDXEditor,
  type MDXEditorMethods,
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
import { Pin } from "lucide-react";
import { apiClient } from "@/api/client";
import { forumThreadQueryOptions, forumRepliesQueryOptions } from "@/api/forum.queries";
import { meQueryOptions } from "@/api/user.queries";
import { farmQueryOptions } from "@/api/farm.queries";
import { checkIsTrialOnly } from "@/lib/membership";
import type { ForumReply, ForumThreadType } from "@/api/types";

const THREAD_TYPE_COLORS: Record<ForumThreadType, string> = {
  question: "bg-blue-100 text-blue-700 border-blue-200",
  feature_request: "bg-purple-100 text-purple-700 border-purple-200",
  bug_report: "bg-red-100 text-red-700 border-red-200",
  general: "bg-gray-100 text-gray-700 border-gray-200",
};
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authed/treffpunkt/$threadId")({
  loader: ({ context: { queryClient }, params: { threadId } }) => {
    queryClient.ensureQueryData(forumThreadQueryOptions(threadId));
    queryClient.ensureQueryData(forumRepliesQueryOptions(threadId));
  },
  component: ThreadDetail,
});

function ThreadDetail() {
  const { threadId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const threadQuery = useQuery(forumThreadQueryOptions(threadId));
  const repliesQuery = useQuery(forumRepliesQueryOptions(threadId));
  const meQuery = useQuery(meQueryOptions());
  const farmQuery = useQuery(farmQueryOptions());
  const isTrialOnly = checkIsTrialOnly(farmQuery.data?.membership);

  const thread = threadQuery.data;
  const replies = repliesQuery.data?.result ?? [];
  const me = meQuery.data;

  // Inline edit state for the thread body
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadBody, setEditThreadBody] = useState("");

  // Inline edit state for a reply
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");

  // New reply form
  const [replyBody, setReplyBody] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const replyEditorRef = useRef<MDXEditorMethods>(null);

  const isOwner = me?.id === thread?.createdBy;
  const isWikiModerator = me?.isWikiModerator ?? false;

  // ── Thread mutations ───────────────────────────────────────────────
  const updateThreadMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await apiClient.PATCH("/v1/forum/threads/byId/{threadId}", {
        params: { path: { threadId } },
        body: { body },
      });
      if (response.error) throw new Error("Failed to update thread");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "threads", "byId", threadId] });
      setEditingThread(false);
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/forum/threads/byId/{threadId}",
        { params: { path: { threadId } } },
      );
      if (response.error) throw new Error("Failed to delete thread");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "threads"] });
      navigate({ to: "/treffpunkt" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: "open" | "closed") => {
      const response = await apiClient.POST(
        "/v1/forum/threads/byId/{threadId}/status",
        { params: { path: { threadId } }, body: { status } },
      );
      if (response.error) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "threads", "byId", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum", "threads"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (pinned: boolean) => {
      const response = await apiClient.POST(
        "/v1/forum/threads/byId/{threadId}/pin",
        { params: { path: { threadId } }, body: { pinned } },
      );
      if (response.error) throw new Error("Failed to update pin");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "threads", "byId", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum", "threads"] });
    },
  });

  // ── Reply mutations ────────────────────────────────────────────────
  const createReplyMutation = useMutation({
    mutationFn: async (body: string) => {
      const response = await apiClient.POST(
        "/v1/forum/threads/byId/{threadId}/replies",
        { params: { path: { threadId } }, body: { body } },
      );
      if (response.error) throw new Error("Failed to create reply");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "threads", "byId", threadId, "replies"],
      });
      setReplyBody("");
      setReplyFocused(false);
      replyEditorRef.current?.setMarkdown("");
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: async ({ replyId, body }: { replyId: string; body: string }) => {
      const response = await apiClient.PATCH("/v1/forum/replies/byId/{replyId}", {
        params: { path: { replyId } },
        body: { body },
      });
      if (response.error) throw new Error("Failed to update reply");
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "threads", "byId", threadId, "replies"],
      });
      setEditingReplyId(null);
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const response = await apiClient.DELETE("/v1/forum/replies/byId/{replyId}", {
        params: { path: { replyId } },
      });
      if (response.error) throw new Error("Failed to delete reply");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "threads", "byId", threadId, "replies"],
      });
    },
  });

  if (!thread) return null;

  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return null;
    return new Date(date).toLocaleDateString();
  }

  // Shared plugin set for write-mode editors (no image plugin)
  function writePlugins() {
    return [
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
    ];
  }

  // Read-only plugin set (no toolbar, no image)
  function readPlugins() {
    return [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
    ];
  }

  return (
    <PageContent
      title={thread.title}
      showBackButton
      backTo={() => navigate({ to: "/treffpunkt" })}
    >
      {/* Thread header badges */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Badge variant="outline" className={THREAD_TYPE_COLORS[thread.type]}>{t(`treffpunkt.types.${thread.type}`)}</Badge>
        <Badge variant={thread.status === "open" ? "secondary" : "outline"}>
          {t(`treffpunkt.status.${thread.status}`)}
        </Badge>
        {thread.isPinned && (
          <Badge variant="secondary" className="gap-1">
            <Pin className="h-3 w-3" />
            {t("treffpunkt.pinned")}
          </Badge>
        )}
      </div>

      {/* Creator info */}
      <p className="text-sm text-muted-foreground mb-4">
        {thread.creator.fullName ?? thread.createdBy}
        {" · "}
        {formatDate(thread.createdAt)}
      </p>

      {/* Thread body */}
      {editingThread ? (
        <div className="mb-4 space-y-2">
          <div className="border rounded-md overflow-hidden">
            <MDXEditor
              key={`edit-thread-${threadId}`}
              markdown={editThreadBody}
              onChange={setEditThreadBody}
              plugins={writePlugins()}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateThreadMutation.mutate(editThreadBody)}
              disabled={updateThreadMutation.isPending}
            >
              {t("common.save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingThread(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <MDXEditor
            readOnly
            markdown={thread.body}
            plugins={readPlugins()}
          />
        </div>
      )}

      {/* Thread owner actions */}
      {isOwner && !editingThread && !isTrialOnly && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditThreadBody(thread.body);
              setEditingThread(true);
            }}
          >
            {t("treffpunkt.editThread")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm(t("treffpunkt.deleteConfirm"))) {
                deleteThreadMutation.mutate();
              }
            }}
            disabled={deleteThreadMutation.isPending}
          >
            {t("common.delete")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              statusMutation.mutate(thread.status === "open" ? "closed" : "open")
            }
            disabled={statusMutation.isPending}
          >
            {thread.status === "open"
              ? t("treffpunkt.closeThread")
              : t("treffpunkt.reopenThread")}
          </Button>
        </div>
      )}

      {/* Pin toggle for moderators only */}
      {isWikiModerator && (
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => pinMutation.mutate(!thread.isPinned)}
            disabled={pinMutation.isPending}
          >
            <Pin className="h-4 w-4 mr-1" />
            {thread.isPinned ? t("treffpunkt.pinned") : t("treffpunkt.pinned")}
          </Button>
        </div>
      )}

      {/* Divider with reply count */}
      <div className="border-t my-6" />
      <h2 className="text-base font-semibold mb-4">
        {t("treffpunkt.replies")} ({replies.length})
      </h2>

      {replies.length === 0 && (
        <p className="text-sm text-muted-foreground mb-6">{t("treffpunkt.noReplies")}</p>
      )}

      {/* Reply list */}
      <div className="space-y-4 mb-6">
        {(replies as ForumReply[]).map((reply) => {
          const isReplyOwner = me?.id === reply.createdBy;
          const isEditingThis = editingReplyId === reply.id;

          return (
            <div key={reply.id} className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                {reply.creator.fullName ?? reply.createdBy}
                {" · "}
                {formatDate(reply.createdAt)}
              </p>

              {isEditingThis ? (
                <div className="space-y-2">
                  <div className="border rounded-md overflow-hidden">
                    <MDXEditor
                      key={`edit-reply-${reply.id}`}
                      markdown={editReplyBody}
                      onChange={setEditReplyBody}
                      plugins={writePlugins()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateReplyMutation.mutate({
                          replyId: reply.id,
                          body: editReplyBody,
                        })
                      }
                      disabled={updateReplyMutation.isPending}
                    >
                      {t("common.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingReplyId(null)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <MDXEditor readOnly markdown={reply.body} plugins={readPlugins()} />
                  {isReplyOwner && !isTrialOnly && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditReplyBody(reply.body);
                          setEditingReplyId(reply.id);
                        }}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(t("treffpunkt.deleteReplyConfirm"))) {
                            deleteReplyMutation.mutate(reply.id);
                          }
                        }}
                        disabled={deleteReplyMutation.isPending}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* New reply form — hidden for trial-only farms */}
      {isTrialOnly ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
          {t("treffpunkt.trialReadOnly")}
        </p>
      ) : (
      <div
        className="border rounded-lg p-4"
        onFocus={() => setReplyFocused(true)}
      >
        <div className="border rounded-md overflow-hidden">
          <MDXEditor
            ref={replyEditorRef}
            markdown={replyBody}
            onChange={setReplyBody}
            plugins={writePlugins()}
          />
        </div>
        {(replyFocused || replyBody.trim()) && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() => createReplyMutation.mutate(replyBody)}
              disabled={createReplyMutation.isPending || !replyBody.trim()}
            >
              {t("treffpunkt.reply")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setReplyBody("");
                setReplyFocused(false);
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </div>
      )}
    </PageContent>
  );
}
