import { PageContent } from "@/components/PageContent";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
});

function Settings() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  console.log("languagel", language);

  function changeLanguage(lang: string) {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  }
  return (
    <PageContent title="Einstellungen">
      <Field className="w-60 mt-6">
        <FieldLabel>Sprache</FieldLabel>
        <Select value={language} onValueChange={changeLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sprache" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="en">Englisch</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </PageContent>
  );
}
