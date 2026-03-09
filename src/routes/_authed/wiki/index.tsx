import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { wikiEntriesQueryOptions, wikiCategoriesQueryOptions, wikiTagsQueryOptions, myWikiEntriesQueryOptions } from "@/api/wiki.queries";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WikiEntry, WikiCategory } from "@/api/types";

export const Route = createFileRoute("/_authed/wiki/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(wikiEntriesQueryOptions());
    queryClient.ensureQueryData(myWikiEntriesQueryOptions());
    queryClient.ensureQueryData(wikiCategoriesQueryOptions());
    queryClient.ensureQueryData(wikiTagsQueryOptions());
  },
  component: WikiList,
});

function WikiList() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | undefined>();
  const [tagSlug, setTagSlug] = useState<string | undefined>();

  const entriesQuery = useQuery(wikiEntriesQueryOptions({ search: search || undefined, categorySlug, tagSlug }));
  const myEntriesQuery = useQuery(myWikiEntriesQueryOptions());
  const categoriesQuery = useQuery(wikiCategoriesQueryOptions());
  const tagsQuery = useQuery(wikiTagsQueryOptions());

  const categories = categoriesQuery.data?.result ?? [];
  const tags = tagsQuery.data?.result ?? [];
  const lang = i18n.language.slice(0, 2);

  // Merge public entries with the user's own entries (any visibility).
  // Own entries take precedence so a public entry authored by the user appears once.
  // Client-side filter own entries to match active filters since the server only
  // filters the public list.
  const entries = useMemo(() => {
    const publicEntries = entriesQuery.data?.result ?? [];
    const myEntries = (myEntriesQuery.data?.result ?? []).filter((e) => {
      if (categorySlug && e.category.slug !== categorySlug) return false;
      if (tagSlug && !e.tags.some((et) => et.tag.slug === tagSlug)) return false;
      if (search) {
        const title = e.translations.find((tr) => tr.locale === lang)?.title ?? "";
        if (!title.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
    const byId = new Map(publicEntries.map((e) => [e.id, e]));
    for (const e of myEntries) byId.set(e.id, e);
    return Array.from(byId.values());
  }, [entriesQuery.data, myEntriesQuery.data, categorySlug, tagSlug, search, lang]);

  function getTitle(entry: WikiEntry) {
    return entry.translations.find((tr) => tr.locale === lang)?.title
      ?? entry.translations[0]?.title
      ?? entry.id;
  }

  function getCategoryName(cat: WikiCategory) {
    return cat.translations.find((tr) => tr.locale === lang)?.name ?? cat.slug;
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { category: WikiCategory; entries: WikiEntry[] }>();
    for (const entry of entries) {
      const existing = map.get(entry.categoryId);
      if (existing) {
        existing.entries.push(entry);
      } else {
        map.set(entry.categoryId, { category: entry.category, entries: [entry] });
      }
    }
    return Array.from(map.values());
  }, [entries]);

  return (
    <PageContent title={t("wiki.title")} showBackButton={false}>
      <div className="flex gap-4 mb-8 flex-wrap items-end">
        <div className="flex flex-col gap-1">
          <Label>{t("common.search")}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>{t("wiki.category")}</Label>
          <Select value={categorySlug ?? "_all"} onValueChange={(v) => setCategorySlug(v === "_all" ? undefined : v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t("common.all")}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {getCategoryName(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>{t("wiki.tags")}</Label>
          <Select value={tagSlug ?? "_all"} onValueChange={(v) => setTagSlug(v === "_all" ? undefined : v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t("common.all")}</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.slug} value={tag.slug}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link to="/wiki/my-entries/new">{t("wiki.newEntry")}</Link>
        </Button>
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noEntries")}</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, entries: catEntries }) => (
            <section key={category.id}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {getCategoryName(category)}
              </h2>
              <hr className="mb-3" />
              <ul className="space-y-1">
                {catEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      to="/wiki/$entryId"
                      params={{ entryId: entry.id }}
                      className="hover:underline text-foreground"
                    >
                      {getTitle(entry)}
                      {entry.visibility === "private" && (
                        <span className="text-muted-foreground ml-1 text-sm">
                          ({t("wiki.visibility.private")})
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContent>
  );
}
