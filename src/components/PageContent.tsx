import { useRouter, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { TypographyH2 } from "./ui/typography";

export function PageContent({
  title,
  children,
  showBackButton = false,
  backTo,
}: {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  backTo?: () => void;
}) {
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

  return (
    <div>
      {showBackButton && (
        <Button
          className="cursor-pointer"
          variant="link"
          size="sm"
          onClick={handleBack}
        >
          <ArrowLeft /> zurück
        </Button>
      )}
      <div>
        <TypographyH2>{title}</TypographyH2>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
