import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/account")({
  component: Account,
});

function Account() {
  const { t } = useTranslation();
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();

  async function handleLogout() {
    await auth.signOut();
    navigate({ to: "/login", search: { redirect: "/dashboard" } });
  }

  return (
    <PageContent title={t("settings.title")}>
      {/* Account settings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("settings.account")}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between max-w-md">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("settings.loggedInAs")}
              </p>
              <p className="font-medium">{auth.user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t("common.signOut")}
          </Button>
        </div>
      </div>
    </PageContent>
  );
}
