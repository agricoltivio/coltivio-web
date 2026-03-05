import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authed/field-calendar/export")({
  component: FieldCalendarExport,
});

type FieldCalendarSection =
  | "cropRotations"
  | "tillages"
  | "fertilizerApplications"
  | "cropProtectionApplications"
  | "harvests";

const SECTIONS: { key: FieldCalendarSection; labelKey: string }[] = [
  { key: "cropRotations", labelKey: "nav.cropRotations" },
  { key: "tillages", labelKey: "fieldCalendar.tillages.title" },
  { key: "fertilizerApplications", labelKey: "fieldCalendar.fertilizerApplications.title" },
  { key: "cropProtectionApplications", labelKey: "fieldCalendar.cropProtectionApplications.title" },
  { key: "harvests", labelKey: "fieldCalendar.harvests.title" },
];

function FieldCalendarExport() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [sections, setSections] = useState<Set<FieldCalendarSection>>(
    new Set(["cropRotations", "tillages", "fertilizerApplications", "cropProtectionApplications", "harvests"]),
  );
  const [exporting, setExporting] = useState(false);

  function toggleSection(section: FieldCalendarSection) {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await apiClient.POST("/v1/reports/fieldcalendar/download", {
        body: {
          fromDate: new Date(fromDate).toISOString(),
          toDate: new Date(`${toDate}T23:59:59`).toISOString(),
          generateCropRotations: sections.has("cropRotations"),
          generateTillages: sections.has("tillages"),
          generateFertilizerApplications: sections.has("fertilizerApplications"),
          generateCropProtectionApplications: sections.has("cropProtectionApplications"),
          generateHarvests: sections.has("harvests"),
        },
      });
      if (response.error || !response.data) throw new Error("Export failed");
      const { base64, fileName } = response.data.data;
      const byteCharacters = atob(base64);
      const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) =>
        byteCharacters.charCodeAt(i),
      );
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageContent title={t("fieldCalendar.exportDialog.title")} showBackButton={false}>
      <div className="max-w-md space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>{t("common.fromDate")}</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("common.toDate")}</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("fieldCalendar.exportDialog.sections")}</Label>
          <div className="space-y-2">
            {SECTIONS.map(({ key, labelKey }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`section-${key}`}
                  checked={sections.has(key)}
                  onCheckedChange={() => toggleSection(key)}
                />
                <label htmlFor={`section-${key}`} className="text-sm cursor-pointer">
                  {t(labelKey)}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || !fromDate || !toDate || sections.size === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? t("common.exporting") : t("common.download")}
        </Button>
      </div>
    </PageContent>
  );
}
