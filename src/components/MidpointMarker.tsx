import { useRef } from "react";
import { Marker } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";

/**
 * A small handle between two points of an outline. Clicking it inserts a point at
 * the handle, dragging it inserts the point where it's dropped.
 */
export function MidpointMarker({
  lngLat,
  onInsert,
  className,
}: {
  lngLat: [number, number];
  onInsert: (lngLat: [number, number]) => void;
  // border colour of the handle, matching the outline it belongs to
  className?: string;
}) {
  // a drag ends with a click on the same handle, that click must not insert again
  const draggedRef = useRef(false);
  return (
    <Marker
      longitude={lngLat[0]}
      latitude={lngLat[1]}
      anchor="center"
      draggable
      onDragEnd={(event) => {
        draggedRef.current = true;
        onInsert([event.lngLat.lng, event.lngLat.lat]);
        // the click (if any) follows right after the drag; reset afterwards, so a drag
        // released elsewhere doesn't swallow the next real click
        setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (draggedRef.current) return;
        onInsert(lngLat);
      }}
    >
      <div className={cn("size-2.5 cursor-copy rounded-full border-2 bg-white/70 shadow", className)} />
    </Marker>
  );
}
