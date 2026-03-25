import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/wiki/admin/")({
  component: WikiAdmin,
});

function WikiAdmin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageContent title={t("wiki.admin")} showBackButton={false}>
      <div className="grid gap-4 max-w-sm">
        <Button variant="outline" onClick={() => navigate({ to: "/wiki/admin/review-queue" })}>
          {t("wiki.reviewQueue")}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/wiki/admin/categories" })}>
          {t("wiki.categories")}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/wiki/admin/entries" })}>
          {t("wiki.manageEntries")}
        </Button>
      </div>
    </PageContent>
  );
}
