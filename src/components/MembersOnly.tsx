import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// In-page gate for the webapp extras that require a membership (contacts, orders,
// products, sponsorships, treffpunkt). The rest of the app is free.
export function MembersOnly() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Lock className="size-10 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{t("membership.membersOnly.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t("membership.membersOnly.description")}
      </p>
      <Button asChild>
        <Link to="/membership">{t("membership.membersOnly.cta")}</Link>
      </Button>
    </div>
  );
}
