import { useRouter, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function PageContent({
  title,
  description,
  actions,
  children,
  showBackButton = false,
  backTo,
}: {
  /** Page title. Omit when the page's heading is already provided elsewhere (e.g. a card title). */
  title?: string;
  /** Optional one-line subtitle shown under the page title. */
  description?: React.ReactNode;
  /** Optional actions (buttons, selects) aligned to the right of the title. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  showBackButton?: boolean;
  backTo?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) {
      backTo();
    } else if (router.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/dashboard" });
    }
  }

  const hasHeader = Boolean(title || description || actions);

  return (
    <div>
      {showBackButton && (
        <Button
          className="-ml-2 mb-1 h-auto gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground"
          variant="ghost"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft /> {t("common.back")}
        </Button>
      )}
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
            )}
            {description && (
              <p className="max-w-prose text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={cn(hasHeader && "mt-6")}>{children}</div>
    </div>
  );
}
