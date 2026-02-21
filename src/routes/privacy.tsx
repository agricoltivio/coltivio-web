import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-12 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
          <p className="text-muted-foreground">Stand: März 2025</p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Verantwortliche Stelle</h2>
            <p>
              Verantwortlich für die Verarbeitung Ihrer personenbezogenen Daten ist:
            </p>
            <address className="not-italic">
              AgriColtivio<br />
              Via Miadi 25<br />
              6544 Braggio<br />
              <a href="mailto:verein@coltivio.ch" className="underline">verein@coltivio.ch</a>
            </address>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Erhobene Daten</h2>
            <h3 className="font-medium">App-Nutzung</h3>
            <p>
              Bei der Nutzung der Coltivio-App und des Web-Portals verarbeiten wir ausschliesslich die Daten, die Sie selbst eingeben — z.&thinsp;B. Tierdaten, Felddaten, Behandlungseinträge und Hofkonfiguration. Diese Daten werden Ihrem Konto zugeordnet und dienen ausschliesslich der Bereitstellung der App-Funktionalität.
            </p>
            <h3 className="font-medium">Kontaktaufnahme</h3>
            <p>
              Wenn Sie uns per E-Mail kontaktieren, speichern wir Ihre E-Mail-Adresse und den Inhalt Ihrer Nachricht, um Ihre Anfrage zu bearbeiten.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Weitergabe an Dritte</h2>
            <p>
              Ihre Daten werden nicht an Dritte weitergegeben, verkauft oder für Werbezwecke verwendet. Es gibt keine Analyse- oder Tracking-Dienste von Drittanbietern in der App.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Hosting</h2>
            <p>
              Die Anwendung wird auf Servern innerhalb der Europäischen Union gehostet. Die Datenbankinfrastruktur wird von Supabase betrieben, das Server in der EU anbietet. Es gelten die DSGVO-Anforderungen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Open-Source-Transparenz</h2>
            <p>
              Coltivio ist ein Open-Source-Projekt. Der Quellcode der App und des Backends ist öffentlich einsehbar auf GitHub. Dadurch kann jede Person überprüfen, welche Daten verarbeitet werden und wie.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Ihre Rechte</h2>
            <p>
              Gemäss dem Schweizer Datenschutzgesetz (DSG) und der europäischen Datenschutzgrundverordnung (DSGVO) haben Sie folgende Rechte:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Recht auf Auskunft über Ihre gespeicherten Daten</li>
              <li>Recht auf Berichtigung unrichtiger Daten</li>
              <li>Recht auf Löschung Ihrer Daten</li>
              <li>Recht auf Einschränkung der Verarbeitung</li>
              <li>Recht auf Datenübertragbarkeit</li>
            </ul>
            <p>
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
              <a href="mailto:verein@coltivio.ch" className="underline">verein@coltivio.ch</a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Änderungen dieser Erklärung</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils aktuelle Version ist stets unter{" "}
              <a href="/privacy" className="underline">/privacy</a> abrufbar. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
