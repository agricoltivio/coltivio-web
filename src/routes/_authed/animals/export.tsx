import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authed/animals/export")({
  component: AnimalsExport,
});

function AnimalsExport() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [treatments, setTreatments] = useState(true);
  const [outdoorJournal, setOutdoorJournal] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await apiClient.POST("/v1/reports/animals/download", {
        body: {
          fromDate: new Date(fromDate).toISOString(),
          toDate: new Date(`${toDate}T23:59:59`).toISOString(),
          generateTreatments: treatments,
          generateOutdoorJournal: outdoorJournal,
        },
      });
      if (response.error || !response.data) throw new Error("Export failed");
      const { base64, fileName } = response.data.data;
      // Decode base64 and trigger a file download
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
    <PageContent
      title={t("animals.export.title")}
      description={t("animals.export.description")}
    >
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
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={treatments}
                onCheckedChange={(value) => setTreatments(value === true)}
              />
              {t("nav.treatmentsJournal")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={outdoorJournal}
                onCheckedChange={(value) => setOutdoorJournal(value === true)}
              />
              {t("nav.turnoutJournal")}
            </label>
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={
            exporting || !fromDate || !toDate || (!treatments && !outdoorJournal)
          }
        >
          {exporting ? t("common.exporting") : t("common.download")}
        </Button>
      </div>
    </PageContent>
  );
}
