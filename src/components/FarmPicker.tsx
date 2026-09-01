import { useTranslation } from "react-i18next";
import { useActiveFarm } from "@/context/ActiveFarmContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Shown when the user belongs to 2+ farms and hasn't selected one (or the stored
// selection went stale). Gates the authenticated app until a farm is picked.
export function FarmPicker() {
  const { t } = useTranslation();
  const { farms, setActiveFarm } = useActiveFarm();

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Card className="max-w-sm w-full mx-auto">
        <CardHeader>
          <CardTitle>{t("farm.picker.heading")}</CardTitle>
          <CardDescription>{t("farm.picker.subheading")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {farms.map((farm) => (
            <button
              key={farm.id}
              onClick={() => setActiveFarm(farm.id)}
              className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted"
            >
              <span className="block text-sm font-medium">{farm.name}</span>
              <span className="block text-xs text-muted-foreground">{farm.address}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
