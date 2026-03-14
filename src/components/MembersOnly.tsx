import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function MembersOnly() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
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
