import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "it", label: "IT" },
  { code: "fr", label: "FR" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentCode = i18n.language.slice(0, 2);
  const currentLabel =
    LANGUAGES.find((l) => l.code === currentCode)?.label ?? "EN";

  function handleSelect(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span>{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={currentCode === lang.code ? "font-semibold" : ""}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
