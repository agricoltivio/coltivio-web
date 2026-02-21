import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
});

function Settings() {
  const { t, i18n } = useTranslation();
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(i18n.language);

  function changeLanguage(lang: string) {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  }

  return (
    <PageContent title={t("settings.title")}>
      {/* Language settings */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">{t("settings.language")}</h2>
        <FieldGroup>
          <Field className="w-60">
            <FieldLabel>{t("settings.language")}</FieldLabel>
            <Select value={language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>
    </PageContent>
  );
}
