import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { wikiEntryByIdQueryOptions } from "@/api/wiki.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/wiki/$entryId")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  loader: ({ context: { queryClient }, params: { entryId } }) => {
    queryClient.ensureQueryData(wikiEntryByIdQueryOptions(entryId));
  },
  component: WikiDetail,
});

function WikiDetail() {
  const { entryId } = Route.useParams();
  const { returnTo } = Route.useSearch();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const entryQuery = useQuery(wikiEntryByIdQueryOptions(entryId));
  const entry = entryQuery.data;

  if (!entry) return null;

  const lang = i18n.language.slice(0, 2);
  const translation = entry.translations.find((tr) => tr.locale === lang) ?? entry.translations[0];
  const categoryName = entry.category.translations.find((tr) => tr.locale === lang)?.name ?? entry.category.slug;

  return (
    <PageContent
      title={translation?.title ?? ""}
      showBackButton
      backTo={() => navigate({ to: returnTo ?? "/wiki" })}
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant="outline">{categoryName}</Badge>
        {entry.tags.map((et) => (
          <Badge key={et.id} variant="secondary">{et.tag.name}</Badge>
        ))}
        {/* Private entries: direct edit; public entries: propose a change */}
        {entry.visibility === "private" ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() =>
              navigate({
                to: "/wiki/my-entries/$entryId/edit",
                params: { entryId: entry.id },
              })
            }
          >
            {t("common.edit")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() =>
              navigate({
                to: "/wiki/my-entries/$entryId/change-request",
                params: { entryId: entry.id },
              })
            }
          >
            {t("wiki.propose")}
          </Button>
        )}
      </div>

      {translation && (
        <MDXEditor
          readOnly
          markdown={translation.body}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
            imagePlugin(),
          ]}
        />
      )}
    </PageContent>
  );
}
