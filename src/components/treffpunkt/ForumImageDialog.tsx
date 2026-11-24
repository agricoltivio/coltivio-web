import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Shows an image of a post full size in a modal: as large as the screen allows, aspect ratio kept
export function ForumImageDialog({
  image,
  onClose,
}: {
  image: { url: string; alt: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-auto max-w-[95vw] p-2 sm:max-w-[95vw]">
        <DialogTitle className="sr-only">
          {image?.alt || t("treffpunkt.image")}
        </DialogTitle>
        {image && (
          <img
            src={image.url}
            alt={image.alt}
            className="max-h-[85vh] max-w-[calc(95vw-1rem)] rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
