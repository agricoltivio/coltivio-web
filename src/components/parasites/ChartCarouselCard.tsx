import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

// One card that pages through several charts (e.g. one per parasite), looping,
// with the current chart's title in the header and dots below
export function ChartCarouselCard({
  pages,
}: {
  pages: { key: string; title: string; content: ReactNode }[];
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Pages can shrink when the data changes
  const currentIndex = Math.min(selectedIndex, pages.length - 1);
  const hasSeveralPages = pages.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {pages[currentIndex]?.title}
        </CardTitle>
        {hasSeveralPages && (
          <CardAction className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="previous"
              onClick={() => carouselApi?.scrollPrev()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="next"
              onClick={() => carouselApi?.scrollNext()}
            >
              <ChevronRight className="size-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {/* No dragging: it would take over drags on the charts' zoom sliders;
            arrows and dots switch charts */}
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: hasSeveralPages, watchDrag: false }}
        >
          <CarouselContent>
            {pages.map((page) => (
              <CarouselItem key={page.key}>{page.content}</CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {hasSeveralPages && (
          <div className="mt-3 flex justify-center gap-1.5">
            {pages.map((page, index) => (
              <button
                key={page.key}
                type="button"
                aria-label={page.title}
                onClick={() => carouselApi?.scrollTo(index)}
                className={cn(
                  "size-2 rounded-full",
                  index === currentIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
