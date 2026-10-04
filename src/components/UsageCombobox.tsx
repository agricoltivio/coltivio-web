import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const USAGE_CODES = [
  501, 502, 504, 505, 506, 507, 508, 510, 511, 512, 513, 514, 515, 516, 519,
  520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 531, 534, 536, 537, 538,
  539, 540, 541, 543, 544, 545, 546, 548, 551, 552, 553, 554, 556, 557, 559,
  566, 567, 568, 569, 570, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581,
  591, 592, 594, 595, 597, 598, 601, 602, 611, 612, 613, 616, 617, 618, 621,
  622, 623, 625, 631, 632, 635, 660, 693, 694, 697, 698, 701, 702, 703, 704,
  705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 717, 718, 719, 720, 721,
  722, 723, 724, 725, 730, 731, 735, 797, 798, 801, 802, 803, 804, 807, 808,
  810, 811, 812, 813, 814, 830, 847, 848, 849, 851, 852, 857, 858, 897, 898,
  901, 902, 903, 904, 905, 906, 907, 908, 909, 911, 921, 922, 923, 924, 926,
  927, 928, 930, 933, 935, 936, 950, 951, 998,
] as const;

// Inline searchable usage code picker — avoids portal/focus-trap conflicts inside Dialog.
// Uses onMouseDown to select before onBlur fires, keeping the dropdown open while scrolling.
export function UsageCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const options = useMemo(
    () => USAGE_CODES.map((code) => ({ code, label: t(`fieldCalendar.plots.usageCodes.${code}`) })),
    [t],
  );

  const selected = options.find((o) => String(o.code) === value) ?? null;

  // Sync display when value is reset externally (dialog reopen)
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || String(o.code).includes(q));
  }, [options, query]);

  return (
    <div className="space-y-1.5">
      <Label>{t("fieldCalendar.plots.usage")}</Label>
      <div className="relative">
        {selected && !open ? (
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-background cursor-pointer" onClick={() => setOpen(true)}>
            <span className="flex-1 truncate">{selected.label} ({selected.code})</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onMouseDown={(e) => { e.stopPropagation(); onChange(""); }}
            >
              ✕
            </button>
          </div>
        ) : (
          <Input
            placeholder={t("fieldCalendar.plots.usage")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off"
          />
        )}
        {open && (
          <div className="absolute z-50 mt-1 w-full border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{t("common.noResults")}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                  onMouseDown={(e) => { e.preventDefault(); onChange(String(o.code)); setQuery(""); setOpen(false); }}
                >
                  {o.label} ({o.code})
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
