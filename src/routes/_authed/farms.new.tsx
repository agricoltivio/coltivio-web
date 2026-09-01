import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { NoFarm } from "@/components/NoFarm";
import { Button } from "@/components/ui/button";

// Entry point for adding another farm (create or join) once the user already has one.
// Reuses the onboarding wizard — on success it calls setActiveFarm() and navigates to
// the dashboard. A cancel button returns to the app (the wizard itself has none, since
// during onboarding there is nowhere to go back to).
export const Route = createFileRoute("/_authed/farms/new")({
  component: AddFarm,
});

function AddFarm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-2"
      >
        <X className="size-4" />
        {t("common.cancel")}
      </Button>
      <NoFarm />
    </div>
  );
}
