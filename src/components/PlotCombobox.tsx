import { useMemo, useRef, useCallback } from "react";
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

  // Cache Fuse results so we only search once per unique query string
  const lastQuery = useRef<string>("");
  const lastMatchedIds = useRef<Set<string>>(new Set());

  const filterFn = useCallback((item: PlotOption, query: string) => {
    if (!query) return true;
    if (query !== lastQuery.current) {
      lastQuery.current = query;
      lastMatchedIds.current = new Set(fuse.search(query).map((r) => r.item.value));
    }
    return lastMatchedIds.current.has(item.value);
  }, [fuse]);

  const selectedOption = options.find((o) => o.value === value) ?? null;

  return (
    <Combobox
      items={options}
      itemToStringValue={(item: PlotOption) => item.name}
      value={selectedOption}
      onValueChange={(item: PlotOption | null) => onValueChange(item?.value ?? null)}
      filter={filterFn}
    >
      <ComboboxInput id={id} placeholder="-" showClear={!!value} />
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
