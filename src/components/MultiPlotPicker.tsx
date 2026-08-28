import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Plot } from "@/api/types";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlotPickerMap } from "@/components/PlotPickerMap";

type PlotOption = {
  value: string;
  name: string;
  localId: string | null;
  size: number;
};

/**
 * Select one or more plots. Selected plots show as removable chips; more can be
 * added via the search combobox or by clicking polygons on the map.
 */
export function MultiPlotPicker({
  plots,
  value,
  onChange,
  id,
}: {
  plots: Plot[];
  value: string[];
  onChange: (plotIds: string[]) => void;
  id?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [mapOpen, setMapOpen] = useState(false);

  const options: PlotOption[] = useMemo(
    () =>
      plots.map((p) => ({
        value: p.id,
        name: p.name,
        localId: p.localId,
        size: p.size,
      })),
    [plots],
  );

  const available = useMemo(
    () => options.filter((o) => !value.includes(o.value)),
    [options, value],
  );

  const fuse = useMemo(
    () =>
      new Fuse(available, {
        keys: [
          { name: "name", weight: 3 },
          { name: "localId", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [available],
  );

  const displayed = useMemo(
    () => (query ? fuse.search(query).map((r) => r.item) : available),
    [fuse, available, query],
  );

  const selectedPlots = value
    .map((plotId) => plots.find((p) => p.id === plotId))
    .filter((p): p is Plot => p != null);

  function add(plotId: string) {
    if (!value.includes(plotId)) onChange([...value, plotId]);
  }
  function remove(plotId: string) {
    onChange(value.filter((existingId) => existingId !== plotId));
  }
  function toggle(plotId: string) {
    if (value.includes(plotId)) remove(plotId);
    else add(plotId);
  }

  return (
    <div className="space-y-2">
      {selectedPlots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPlots.map((plot) => (
            <span
              key={plot.id}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-1 pl-2.5 pr-1 text-sm"
            >
              {plot.name}
              <button
                type="button"
                onClick={() => remove(plot.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={t("common.deselectAll")}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Combobox
            items={displayed}
            value={null}
            onValueChange={(item: PlotOption | null) => {
              if (item) {
                add(item.value);
                setQuery("");
              }
            }}
            filter={() => true}
          >
            <ComboboxInput
              id={id}
              placeholder={t("common.search")}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
            <ComboboxContent>
              <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
              <ComboboxList>
                {(option: PlotOption) => (
                  <ComboboxItem
                    key={option.value}
                    value={option}
                    className="flex-col items-start gap-0.5 py-2"
                  >
                    <span className="font-medium">
                      {option.name} ({(option.size / 100).toFixed(0)}a)
                    </span>
                    {option.localId && (
                      <span className="text-xs text-muted-foreground">
                        {t("fieldCalendar.plots.localId")}: {option.localId}
                      </span>
                    )}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => setMapOpen(true)}
        >
          {t("fieldCalendar.plots.openMap")}
        </Button>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{t("fieldCalendar.plots.selectPlot")}</DialogTitle>
          </DialogHeader>
          <PlotPickerMap plots={plots} selectedIds={value} onPick={toggle} />
          <DialogFooter>
            <Button type="button" onClick={() => setMapOpen(false)}>
              {t("common.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
