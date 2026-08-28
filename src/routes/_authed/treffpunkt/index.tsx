import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useState, useEffect } from "react";
import { MessageSquare, Pin } from "lucide-react";
import { forumThreadsQueryOptions } from "@/api/forum.queries";
import { useAuth } from "@/context/SupabaseAuthContext";
import type { ForumThread, ForumThreadType } from "@/api/types";
import { threadTypeBadgeClass } from "@/lib/ui";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/treffpunkt/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(forumThreadsQueryOptions());
  },
  component: TreffpunktPage,
});

const THREAD_TYPES: ForumThreadType[] = [
  "question",
  "feature_request",
  "bug_report",
  "general",
];

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function TreffpunktPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<ForumThreadType | "all">("all");
  const [onlyOpen, setOnlyOpen] = useState(true);
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
      result = result.filter((thread) => thread.type === typeFilter);
    }

    if (onlyOpen) {
      result = result.filter((thread) => thread.status === "open");
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((thread) => thread.title.toLowerCase().includes(lower));
    }

    // Pinned threads first, then by most recent activity descending
    return [...result].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aDate = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : 0;
      const bDate = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [allThreads, typeFilter, onlyOpen, search]);

  function formatDate(date: string | unknown) {
    if (!date || typeof date !== "string") return null;
    return new Date(date).toLocaleDateString();
  }

  return (
    <PageContent
      title={t("treffpunkt.title")}
      showBackButton={false}
      actions={
        <Button asChild>
          <Link to="/treffpunkt/create">{t("treffpunkt.newThread")}</Link>
        </Button>
      }
    >
      <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start lg:gap-10">
        {/* Threads */}
        <div className="min-w-0 flex-1 space-y-4 lg:max-w-2xl">
          <Input
            className="h-10 text-base"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {threadsQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("treffpunkt.noThreads")}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/treffpunkt/$threadId",
                      params: { threadId: thread.id },
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span
                    title={t(`treffpunkt.status.${thread.status}`)}
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      thread.status === "open" ? "bg-green-500" : "bg-purple-500",
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {thread.isPinned && (
                        <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 max-w-full truncate text-sm font-medium">
                        {thread.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 font-normal",
                          threadTypeBadgeClass[thread.type],
                        )}
                      >
                        {t(`treffpunkt.types.${thread.type}`)}
                      </Badge>
                      <div className="min-w-0 flex-1" />
                      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                        <MessageSquare className="size-4" />
                        <span className="text-sm">{thread.replyCount ?? 0}</span>
                      </span>
                    </div>
                    <span className="text-xs leading-4 text-muted-foreground">
                      {t("treffpunkt.dateByAuthor", {
                        date: formatDate(thread.updatedAt),
                        author: thread.creator.fullName ?? t("common.unknown"),
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <aside className="space-y-4 lg:w-72 lg:shrink-0">
          <p className="text-sm font-semibold">{t("tasks.filter.title")}</p>

          <div className="flex flex-wrap gap-2">
            <FilterPill active={onlyOpen} onClick={() => setOnlyOpen((v) => !v)}>
              {t("treffpunkt.filterOnlyOpen")}
            </FilterPill>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("treffpunkt.type")}
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={typeFilter === "all"}
                onClick={() => setTypeFilter("all")}
              >
                {t("treffpunkt.allTypes")}
              </FilterPill>
              {THREAD_TYPES.map((type) => (
                <FilterPill
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                >
                  {t(`treffpunkt.types.${type}`)}
                </FilterPill>
              ))}
            </div>
          </div>
        </aside>
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
