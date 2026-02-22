import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Datenlöschung</h1>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Was wird gespeichert?</h2>
            <p className="text-muted-foreground">
              Coltivio speichert ausschliesslich die Daten, die Sie selbst in
              der App erfassen: Hofdaten, Tierdaten, Felddaten,
              Behandlungseinträge und Ihre E-Mail-Adresse als
              Konto-Identifikator.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">
              Konto und Daten in der App löschen
            </h2>
            <p className="text-muted-foreground">
              Sie können Ihr Konto und alle zugehörigen Daten direkt in der
              mobilen App löschen:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Öffnen Sie die Coltivio-App</li>
              <li>
                Navigieren Sie zu{" "}
                <strong className="text-foreground">Mein Hof</strong>
              </li>
              <li>
                Tippen Sie auf{" "}
                <strong className="text-foreground">löschen</strong>
              </li>
              <li>
                Wählen Sie{" "}
                <strong className="text-foreground">Konto löschen</strong>
              </li>
              <li>Geben Sie den Hofnamen zur Bestätigung ein</li>
              <li>
                Tippen Sie auf{" "}
                <strong className="text-foreground">Hof löschen</strong>
              </li>
            </ol>
            <p className="text-muted-foreground">
              Damit werden alle Ihre Daten unwiderruflich gelöscht.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">
              Löschung per E-Mail beantragen
            </h2>
            <p className="text-muted-foreground">
              Falls Sie keinen Zugang zur App haben, können Sie die Löschung
              Ihres Kontos per E-Mail beantragen:
            </p>
            <p>
              <a
                href="mailto:support@coltivio.ch?subject=Kontolöschung"
                className="underline hover:no-underline font-medium"
              >
                support@coltivio.ch
              </a>
            </p>
            <p className="text-muted-foreground">
              Bitte geben Sie die E-Mail-Adresse Ihres Kontos an. Wir werden
              Ihre Anfrage innerhalb von 30 Tagen bearbeiten.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
