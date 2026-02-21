import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/imprint")({
  component: ImprintPage,
});

function ImprintPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <h1 className="text-3xl font-bold">Impressum</h1>

        <div className="space-y-1 text-base">
          <p className="font-semibold">AgriColtivio</p>
          <p>Via Miadi 25</p>
          <p>6544 Braggio</p>
          <p>
            <a href="mailto:verein@coltivio.ch" className="underline hover:no-underline">
              verein@coltivio.ch
            </a>
          </p>
          <p>
            <a href="tel:+41797567181" className="underline hover:no-underline">
              +41 79 756 71 81
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
