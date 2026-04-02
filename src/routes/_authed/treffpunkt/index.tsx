import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useState, useEffect } from "react";
import { MessageSquare, Pin } from "lucide-react";
import { forumThreadsQueryOptions } from "@/api/forum.queries";
import { useAuth } from "@/context/SupabaseAuthContext";
import type { ForumThread, ForumThreadType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authed/treffpunkt/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(forumThreadsQueryOptions());
  },
  component: TreffpunktPage,
});

const THREAD_TYPE_COLORS: Record<ForumThreadType, string> = {
  question: "bg-blue-100 text-blue-700 border-blue-200",
  feature_request: "bg-purple-100 text-purple-700 border-purple-200",
  bug_report: "bg-red-100 text-red-700 border-red-200",
  general: "bg-gray-100 text-gray-700 border-gray-200",
};

const THREAD_TYPES: ForumThreadType[] = [
  "question",
  "feature_request",
  "bug_report",
  "general",
];

function TreffpunktPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ForumThreadType | "all">("all");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const userId = user!.id;
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [hasReadRules, setHasReadRules] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(`${userId}:treffpunkt_welcome_shown`) !== "true") {
      setShowWelcomeDialog(true);
    }
  }, [userId]);

  function closeWelcomeDialog() {
    localStorage.setItem(`${userId}:treffpunkt_welcome_shown`, "true");
    setShowWelcomeDialog(false);
  }

  const threadsQuery = useQuery(forumThreadsQueryOptions());
  const allThreads = threadsQuery.data?.result ?? [];

  const filtered = useMemo(() => {
    let result = allThreads as ForumThread[];

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(lower));
    }

    // Pinned threads first, then by most recent activity descending
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aDate = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : 0;
      const bDate = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [allThreads, typeFilter, search]);

  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return null;
    return new Date(date).toLocaleDateString();
  }

  return (
    <PageContent title={t("treffpunkt.title")} showBackButton={false}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            {t("treffpunkt.allTypes")}
          </Button>
          {THREAD_TYPES.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {t(`treffpunkt.types.${type}`)}
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link to="/treffpunkt/create">{t("treffpunkt.newThread")}</Link>
        </Button>
      </div>



      <div className="mb-4">
        <Input
          className="w-64"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {threadsQuery.isLoading && (
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {!threadsQuery.isLoading && filtered.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          {t("treffpunkt.noThreads")}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() =>
              navigate({ to: "/treffpunkt/$threadId", params: { threadId: thread.id } })
            }
            className="w-full text-left border rounded-lg px-4 py-3 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {thread.isPinned && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Pin className="h-3 w-3" />
                      {t("treffpunkt.pinned")}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${THREAD_TYPE_COLORS[thread.type]}`}>
                    {t(`treffpunkt.types.${thread.type}`)}
                  </Badge>
                  <Badge
                    variant={thread.status === "open" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {t(`treffpunkt.status.${thread.status}`)}
                  </Badge>
                </div>
                <p className="font-medium truncate">{thread.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {thread.creator.fullName ?? t("common.unknown")}
                  {" · "}
                  {formatDate(thread.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">{thread.replyCount ?? 0}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Dialog open={showWelcomeDialog}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("treffpunkt.welcome.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("treffpunkt.welcome.description")}</p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {(t("treffpunkt.welcome.rules", { returnObjects: true }) as string[]).map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="treffpunkt-rules-read"
              checked={hasReadRules}
              onCheckedChange={(checked) => setHasReadRules(checked === true)}
            />
            <Label htmlFor="treffpunkt-rules-read" className="text-sm cursor-pointer">
              {t("treffpunkt.welcome.readConfirm")}
            </Label>
          </div>
          <DialogFooter>
            <Button onClick={closeWelcomeDialog} disabled={!hasReadRules}>
              {t("treffpunkt.welcome.cta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
