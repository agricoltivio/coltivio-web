import { useMemo, useState } from "react";
import Fuse from "fuse.js";
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

type PlotOption = {
  value: string;
  name: string;
  localId: string | null;
  usage: number | null;
  size: number;
};

type PlotComboboxProps = {
  plots: Plot[];
  value: string | null;
  onValueChange: (plotId: string | null) => void;
  id?: string;
};

export function PlotCombobox({ plots, value, onValueChange, id }: PlotComboboxProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const options: PlotOption[] = useMemo(
    () => plots.map((p) => ({
      value: p.id,
      name: p.name,
      localId: p.localId,
      usage: p.usage,
      size: p.size,
    })),
    [plots],
  );

  const fuse = useMemo(
    () => new Fuse(options, {
      keys: [
        { name: "name", weight: 3 },
        { name: "localId", weight: 2 },
        { name: "usage", getFn: (o) => (o.usage != null ? String(o.usage) : ""), weight: 1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    }),
    [options],
  );

  // Pre-filter and pre-sort via Fuse so relevance ranking is preserved.
  // base-ui's filter prop only does boolean inclusion and loses Fuse's ordering.
  const displayedOptions = useMemo(
    () => (query ? fuse.search(query).map((r) => r.item) : options),
    [fuse, options, query],
  );

  const selectedOption = options.find((o) => o.value === value) ?? null;

  return (
    <Combobox
      items={displayedOptions}
      itemToStringValue={(item: PlotOption) => item.name}
      value={selectedOption}
      onValueChange={(item: PlotOption | null) => {
        onValueChange(item?.value ?? null);
        setQuery("");
      }}
      filter={() => true}
    >
      <ComboboxInput
        id={id}
        placeholder="-"
        showClear={!!value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
        <ComboboxList>
          {(option: PlotOption) => (
            <ComboboxItem key={option.value} value={option} className="flex-col items-start gap-0.5 py-2">
              <span className="font-medium">
                {option.name} ({(option.size / 100).toFixed(0)}a)
              </span>
              {option.usage != null && (
                <span className="text-xs text-muted-foreground">
                  {t("fieldCalendar.plots.usage")}: {option.usage}
                </span>
              )}
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
  );
}
