import { useState } from "react";
import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PLOT_COLOR_MODES, type PlotColorMode } from "@/lib/plotColor";

/** Icon button + popover to choose how plot polygons are coloured on a map. */
export function PlotColorModeToggle({
  value,
  onChange,
}: {
  value: PlotColorMode;
  onChange: (mode: PlotColorMode) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Palette className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-9 top-0 min-w-32 rounded-md border bg-background py-1 shadow-md">
          {PLOT_COLOR_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm hover:bg-accent",
                mode === value && "font-semibold text-primary",
              )}
              onClick={() => {
                onChange(mode);
                setOpen(false);
              }}
            >
              {t(`fieldCalendar.plots.colorMode.${mode}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
