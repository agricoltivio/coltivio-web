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
import { Pin, MoreHorizontal } from "lucide-react";
import { apiClient } from "@/api/client";
import { forumThreadQueryOptions, forumRepliesQueryOptions } from "@/api/forum.queries";
import { meQueryOptions } from "@/api/user.queries";
import { farmQueryOptions } from "@/api/farm.queries";
import type { ForumReply } from "@/api/types";
import { threadTypeBadgeClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Shared card shell for the initial post and every reply, GitHub-issue style.
function EntryCard({
  headerLeft,
  headerRight,
  children,
}: {
  headerLeft: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-primary/15 bg-accent px-3 py-2 text-accent-foreground">
        <div className="flex min-w-0 flex-1 items-center gap-2">{headerLeft}</div>
        {headerRight ? (
          <div className="flex shrink-0 items-center gap-1.5">{headerRight}</div>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// The 3-dots edit/delete menu shown to the author of an entry.
function EntryMenu({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  disabled,
}: {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          disabled={disabled}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{editLabel}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Route = createFileRoute("/_authed/treffpunkt/$threadId")({
  loader: ({ context: { queryClient }, params: { threadId } }) => {
    queryClient.ensureQueryData(forumThreadQueryOptions(threadId));
    queryClient.ensureQueryData(forumRepliesQueryOptions(threadId));
  },
  component: ThreadDetail,
});

function ThreadDetail() {
  const { threadId } = Route.useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const threadQuery = useQuery(forumThreadQueryOptions(threadId));
  const repliesQuery = useQuery(forumRepliesQueryOptions(threadId));
  const meQuery = useQuery(meQueryOptions());
  const farmQuery = useQuery(farmQueryOptions());

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

  // Localized "3 days ago" style relative time for entry headers.
  const relativeTimeFormat = new Intl.RelativeTimeFormat(i18n.language, {
    numeric: "auto",
  });
  function timeAgo(date: string | unknown): string {
    if (!date || typeof date !== "string") return "";
    const diffSeconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    if (abs < 3600) return relativeTimeFormat.format(Math.round(diffSeconds / 60), "minute");
    if (abs < 86400) return relativeTimeFormat.format(Math.round(diffSeconds / 3600), "hour");
    if (abs < 604800) return relativeTimeFormat.format(Math.round(diffSeconds / 86400), "day");
    if (abs < 2592000) return relativeTimeFormat.format(Math.round(diffSeconds / 604800), "week");
    if (abs < 31536000)
      return relativeTimeFormat.format(Math.round(diffSeconds / 2592000), "month");
    return relativeTimeFormat.format(Math.round(diffSeconds / 31536000), "year");
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
      actions={
        isOwner ? (
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
        ) : undefined
      }
    >
      {/* Thread meta badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={threadTypeBadgeClass[thread.type]}>
          {t(`treffpunkt.types.${thread.type}`)}
        </Badge>
        <Badge variant={thread.status === "open" ? "secondary" : "outline"}>
          {t(`treffpunkt.status.${thread.status}`)}
        </Badge>
        {thread.isPinned && (
          <Badge variant="secondary" className="gap-1">
            <Pin className="h-3 w-3" />
            {t("treffpunkt.pinned")}
          </Badge>
        )}
        {isWikiModerator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => pinMutation.mutate(!thread.isPinned)}
            disabled={pinMutation.isPending}
          >
            <Pin className="size-4" />
            {t("treffpunkt.pinned")}
          </Button>
        )}
      </div>

      {/* Timeline: initial post + replies share the same card design */}
      <div className="max-w-3xl space-y-0">
        {/* Initial post */}
        <div>
          <EntryCard
            headerLeft={
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium text-foreground">
                  {thread.creator.fullName ?? t("common.unknown")}
                </span>{" "}
                <span className="text-muted-foreground">
                  {t("treffpunkt.entryOpened")} · {timeAgo(thread.createdAt)}
                </span>
              </span>
            }
            headerRight={
              <>
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {t("treffpunkt.authorBadge")}
                </Badge>
                {isOwner && !editingThread && (
                  <EntryMenu
                    editLabel={t("common.edit")}
                    deleteLabel={t("common.delete")}
                    disabled={deleteThreadMutation.isPending}
                    onEdit={() => {
                      setEditThreadBody(thread.body);
                      setEditingThread(true);
                    }}
                    onDelete={() => {
                      if (window.confirm(t("treffpunkt.deleteConfirm"))) {
                        deleteThreadMutation.mutate();
                      }
                    }}
                  />
                )}
              </>
            }
          >
            {editingThread ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-md border">
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
              // MDXEditor only reads `markdown` on mount, so key by content to
              // force a remount when the body changes after an edit.
              <MDXEditor
                key={`thread-body:${thread.body}`}
                readOnly
                markdown={thread.body}
                plugins={readPlugins()}
              />
            )}
          </EntryCard>
        </div>

        {/* Replies */}
        {(replies as ForumReply[]).map((reply) => {
          const isReplyOwner = me?.id === reply.createdBy;
          const isReplyByThreadAuthor = reply.createdBy === thread.createdBy;
          const isEditingThis = editingReplyId === reply.id;

          return (
            <div key={reply.id}>
              {/* Timeline connector from the previous card */}
              <div aria-hidden className="mx-auto h-14 w-0.5 bg-border" />
              <EntryCard
                headerLeft={
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="font-medium text-foreground">
                      {reply.creator.fullName ?? t("common.unknown")}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("treffpunkt.entryReplied")} · {timeAgo(reply.createdAt)}
                    </span>
                  </span>
                }
                headerRight={
                  <>
                    {isReplyByThreadAuthor && (
                      <Badge variant="secondary" className="shrink-0 font-normal">
                        {t("treffpunkt.authorBadge")}
                      </Badge>
                    )}
                    {isReplyOwner && !isEditingThis && (
                      <EntryMenu
                        editLabel={t("common.edit")}
                        deleteLabel={t("common.delete")}
                        disabled={deleteReplyMutation.isPending}
                        onEdit={() => {
                          setEditReplyBody(reply.body);
                          setEditingReplyId(reply.id);
                        }}
                        onDelete={() => {
                          if (window.confirm(t("treffpunkt.deleteReplyConfirm"))) {
                            deleteReplyMutation.mutate(reply.id);
                          }
                        }}
                      />
                    )}
                  </>
                }
              >
                {isEditingThis ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-md border">
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
                  <MDXEditor
                    key={`reply-body:${reply.id}:${reply.body}`}
                    readOnly
                    markdown={reply.body}
                    plugins={readPlugins()}
                  />
                )}
              </EntryCard>
            </div>
          );
        })}
      </div>

      {/* Add a comment */}
      {thread.status === "open" && (
        <div className="mt-8 max-w-3xl">
          <h2 className="mb-2 text-base font-semibold">
            {t("treffpunkt.addComment")}
          </h2>
          <div
            className="rounded-lg border p-3"
            onFocus={() => setReplyFocused(true)}
          >
            <div className="overflow-hidden rounded-md border">
              <MDXEditor
                ref={replyEditorRef}
                markdown={replyBody}
                onChange={setReplyBody}
                plugins={writePlugins()}
              />
            </div>
            {(replyFocused || replyBody.trim()) && (
              <div className="mt-2 flex gap-2">
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
        </div>
      )}
    </PageContent>
  );
}
