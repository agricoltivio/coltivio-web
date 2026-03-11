import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { wikiCategoriesQueryOptions } from "@/api/wiki.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

const LOCALES = ["de", "en", "it", "fr"] as const;

export const Route = createFileRoute("/_authed/wiki/admin/categories/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(wikiCategoriesQueryOptions());
  },
  component: WikiCategories,
});

function WikiCategories() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = i18n.language.slice(0, 2);

  const categoriesQuery = useQuery(wikiCategoriesQueryOptions());
  const categories = categoriesQuery.data?.result ?? [];

  const [slug, setSlug] = useState("");
  const [names, setNames] = useState<Record<string, string>>({ de: "", en: "", it: "", fr: "" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.POST("/v1/wiki/admin/categories", {
        body: {
          slug,
          translations: LOCALES.map((locale) => ({ locale, name: names[locale] ?? "" })).filter((tr) => tr.name),
        },
      });
      if (response.error) throw new Error("Failed to create category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki", "categories"] });
      setSlug("");
      setNames({ de: "", en: "", it: "", fr: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await apiClient.DELETE("/v1/wiki/admin/categories/byId/{categoryId}", {
        params: { path: { categoryId } },
      });
      if (response.error) throw new Error("Failed to delete category");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki", "categories"] }),
  });

  return (
    <PageContent
      title={t("wiki.categories")}
      showBackButton
      backTo={() => navigate({ to: "/wiki/admin" })}
    >
      {/* Create form */}
      <div className="border rounded-lg p-4 mb-6 max-w-lg space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="cat-slug">{t("wiki.categorySlug")} *</FieldLabel>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-category"
            />
          </Field>
        </FieldGroup>
        {LOCALES.map((locale) => (
          <FieldGroup key={locale}>
            <Field>
              <FieldLabel htmlFor={`cat-name-${locale}`}>
                {t("wiki.categoryName")} ({locale.toUpperCase()})
              </FieldLabel>
              <Input
                id={`cat-name-${locale}`}
                value={names[locale]}
                onChange={(e) => setNames((prev) => ({ ...prev, [locale]: e.target.value }))}
              />
            </Field>
          </FieldGroup>
        ))}
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!slug || createMutation.isPending}
        >
          {t("wiki.addCategory")}
        </Button>
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <p className="text-muted-foreground">{t("wiki.noCategories")}</p>
      ) : (
        <div className="grid gap-2">
          {categories.map((cat) => {
            const name = cat.translations.find((tr) => tr.locale === lang)?.name ?? cat.slug;
            return (
              <div key={cat.id} className="border rounded-lg p-3 flex items-center gap-3">
                <span className="flex-1 font-medium">{name}</span>
                <span className="text-sm text-muted-foreground">{cat.slug}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("common.confirm"))) deleteMutation.mutate(cat.id);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {t("common.delete")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}
