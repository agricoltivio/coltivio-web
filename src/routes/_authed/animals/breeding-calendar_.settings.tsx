import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { gestationSettingsQueryOptions } from "@/api/breeding.queries";
import { meQueryOptions } from "@/api/user.queries";
import type { AnimalType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute(
  "/_authed/animals/breeding-calendar_/settings",
)({
  component: BreedingSettingsPage,
});

// Gestation days (per farm) of the breeding calendar. Push reminders are set in the app, which holds the
// device permission and push token.
function BreedingSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <PageContent
      title={t("breeding.settingsTitle")}
      showBackButton
      backTo={() => navigate({ to: "/animals/breeding-calendar" })}
    >
      <div className="max-w-lg">
        <GestationSettingsCard />
      </div>
    </PageContent>
  );
}

function GestationSettingsCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const meQuery = useQuery(meQueryOptions());
  const isOwner = meQuery.data?.farmRole === "owner";
  const gestationSettingsQuery = useQuery(gestationSettingsQueryOptions());
  const [gestationInputs, setGestationInputs] = useState<
    Partial<Record<AnimalType, string>>
  >({});

  useEffect(() => {
    if (!gestationSettingsQuery.data) return;
    const inputs: Partial<Record<AnimalType, string>> = {};
    for (const setting of gestationSettingsQuery.data)
      inputs[setting.animalType] = String(setting.gestationDays);
    setGestationInputs(inputs);
  }, [gestationSettingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings = (gestationSettingsQuery.data ?? []).map((setting) => {
        const gestationDays = parseInt(
          gestationInputs[setting.animalType] ?? "",
          10,
        );
        const isValidValue =
          Number.isFinite(gestationDays) && gestationDays > 0;
        // An empty field resets the type to its default. An unchanged default stays a default, so later
        // changes of the default still apply and it keeps its "default" label.
        const keepsDefault =
          setting.isDefault && gestationDays === setting.gestationDays;
        return {
          animalType: setting.animalType,
          gestationDays: isValidValue && !keepsDefault ? gestationDays : null,
        };
      });
      const response = await apiClient.PUT(
        "/v1/animals/breedingCalendar/gestationSettings",
        {
          body: { settings },
        },
      );
      if (response.error) throw new Error("Failed to save gestation settings");
    },
    // Expected birth dates depend on the gestation days
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["breeding"] }),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("breeding.gestationDays")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? t("breeding.gestationDescription")
              : t("breeding.onlyOwnerCanEdit")}
          </p>
          {gestationSettingsQuery.data?.map((setting) => (
            <div
              key={setting.animalType}
              className="grid grid-cols-[1fr_6rem] items-center gap-3"
            >
              <Label
                htmlFor={`gestation-${setting.animalType}`}
                className="font-normal"
              >
                {t(`animals.types.${setting.animalType}`)}
                {setting.isDefault && (
                  <span className="ml-1 text-muted-foreground">
                    ({t("breeding.default")})
                  </span>
                )}
              </Label>
              <Input
                id={`gestation-${setting.animalType}`}
                type="number"
                min="1"
                disabled={!isOwner}
                value={gestationInputs[setting.animalType] ?? ""}
                onChange={(event) =>
                  setGestationInputs((inputs) => ({
                    ...inputs,
                    [setting.animalType]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
          {saveMutation.isError && (
            <p className="text-sm text-destructive">
              {t("breeding.saveFailed")}
            </p>
          )}
        </CardContent>
      </Card>
      {/* Save below the form, right aligned, like the other forms */}
      {isOwner && (
        <div className="flex justify-end gap-3 pt-6">
          <Button
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t("common.save")}
          </Button>
        </div>
      )}
    </>
  );
}
