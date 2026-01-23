import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { TypographyH2 } from "./ui/typography";

export function PageContent({
  title,
  children,
  showBackButton = true,
}: {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
}) {
  const router = useRouter();

  return (
    <div>
      {showBackButton && (
        <Button
          className="cursor-pointer"
          variant="link"
          size="sm"
          onClick={() => router.history.back()}
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
