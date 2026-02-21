import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Github } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <img src="/logo.png" alt="Coltivio" className="h-7" />
            Coltivio
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild size="sm">
              <Link to="/dashboard">{t("landing.nav.openApp")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center px-4 py-16">
        <div className="grid gap-12 md:grid-cols-2 md:items-center w-full">
          {/* Text */}
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight md:text-7xl whitespace-pre-line">
              {t("landing.hero.headline")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg md:text-xl">
              {t("landing.hero.sub")}
            </p>
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground border rounded-lg px-4 py-3 bg-muted/40">
                {t("landing.hero.testPhase")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a
                    href="https://testflight.apple.com/join/placeholder"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("landing.hero.ctaIos")}
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="mailto:support@coltivio.ch?subject=Android Beta">
                    {t("landing.hero.ctaAndroid")}
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Phone frame mockup */}
          <div className="flex justify-center md:justify-end lg:justify-center">
            <PhoneMockup
              src="/screenshots/home.png"
              rotate="md:-rotate-3"
              className="flex md:order-first"
            />
            {/* <div className="-rotate-3 relative w-56 rounded-[2.5rem] border-4 border-foreground/20 bg-background shadow-2xl overflow-hidden aspect-[9/19]">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-foreground/10 z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent" />
            </div> */}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-10">
          <h2 className="text-3xl font-bold md:text-4xl">
            {t("landing.story.headline")}
          </h2>
          <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
            <p>{t("landing.story.founders")}</p>
            <p>{t("landing.story.problem")}</p>
            <p className="text-foreground font-medium">
              {t("landing.story.born")}
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 space-y-20">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("landing.fieldwork.sub")}
          </p>

          {/* Field Work */}
          <div className="grid gap-12 lg:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">
                {t("landing.fieldwork.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureCard
                  title={t("landing.fieldwork.plots.title")}
                  desc={t("landing.fieldwork.plots.desc")}
                />
                <FeatureCard
                  title={t("landing.fieldwork.protection.title")}
                  desc={t("landing.fieldwork.protection.desc")}
                />
                <FeatureCard
                  title={t("landing.fieldwork.harvest.title")}
                  desc={t("landing.fieldwork.harvest.desc")}
                />
                <FeatureCard
                  title={t("landing.fieldwork.export.title")}
                  desc={t("landing.fieldwork.export.desc")}
                />
              </div>
            </div>
            <PhoneMockup
              src="/screenshots/fieldwork.png"
              rotate="lg:rotate-3"
            />
          </div>

          {/* Animal Husbandry */}
          <div className="grid gap-12 lg:grid-cols-2 md:items-center">
            <PhoneMockup
              src="/screenshots/animals.png"
              className="hidden lg:flex"
              rotate="lg:-rotate-3"
            />
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">
                {t("landing.animals.title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureCard
                  title={t("landing.animals.import.title")}
                  desc={t("landing.animals.import.desc")}
                />
                <FeatureCard
                  title={t("landing.animals.treatments.title")}
                  desc={t("landing.animals.treatments.desc")}
                />
                <FeatureCard
                  title={t("landing.animals.turnout.title")}
                  desc={t("landing.animals.turnout.desc")}
                />
                <FeatureCard
                  title={t("landing.animals.export.title")}
                  desc={t("landing.animals.export.desc")}
                />
              </div>
            </div>

            <PhoneMockup
              src="/screenshots/animals.png"
              className="sm:flex lg:hidden"
              rotate=""
            />
          </div>

          {/* Demo video */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">{t("landing.demo.title")}</h3>
            <div className="relative w-full overflow-hidden rounded-xl aspect-video">
              <iframe
                src="https://www.youtube.com/embed/7dShhXfILDM"
                title={t("landing.demo.title")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Customization */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold md:text-4xl">
              {t("landing.customize.headline")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("landing.customize.sub")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeatureCard
              title={t("landing.customize.speedDial.title")}
              desc={t("landing.customize.speedDial.desc")}
            />
            <FeatureCard
              title={t("landing.customize.modules.title")}
              desc={t("landing.customize.modules.desc")}
            />
          </div>
        </div>
      </section>

      {/* Web App */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4 space-y-20">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("landing.webapp.label")}
          </p>

          <div className="space-y-6 max-w-3xl">
            <h2 className="text-2xl font-bold">{t("landing.webapp.title")}</h2>
            <p className="text-muted-foreground">{t("landing.webapp.body")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FeatureCard
                title={t("landing.webapp.contacts.title")}
                desc={t("landing.webapp.contacts.desc")}
              />
              <FeatureCard
                title={t("landing.webapp.orders.title")}
                desc={t("landing.webapp.orders.desc")}
              />
              <FeatureCard
                title={t("landing.webapp.sponsorships.title")}
                desc={t("landing.webapp.sponsorships.desc")}
              />
            </div>
            <Button asChild size="lg">
              <Link to="/dashboard">{t("landing.nav.openApp")} →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* OSS */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          <h2 className="text-3xl font-bold">{t("landing.story.ossTitle")}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>{t("landing.story.oss")}</p>
            <p>{t("landing.story.data")}</p>
            <p>{t("landing.story.funding")}</p>
          </div>
          <Button asChild variant="outline" size="lg">
            <a
              href="https://github.com/coltivio"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <Github className="h-4 w-4" />
              {t("landing.oss.github")} →
            </a>
          </Button>
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <h2 className="text-3xl font-bold">{t("landing.newsletter.title")}</h2>
          <p className="text-muted-foreground">{t("landing.newsletter.sub")}</p>
          <NewsletterForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <img src="/icon.png" alt="Coltivio" className="h-5 w-5" />
              Coltivio · {t("landing.footer.tagline")}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Button asChild variant="ghost" size="sm">
                <a
                  href="https://github.com/coltivio"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("landing.footer.github")}
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href="https://testflight.apple.com/join/placeholder"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("landing.footer.iosBeta")}
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href="mailto:support@coltivio.ch?subject=Android Beta">
                  {t("landing.footer.androidBeta")}
                </a>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/imprint" className="hover:underline">
              Impressum
            </Link>
            <Link to="/privacy" className="hover:underline">
              Datenschutz
            </Link>
            <Link to="/data-deletion" className="hover:underline">
              Datenlöschung
            </Link>
            <span className="ml-auto">© 2025 Coltivio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Drop in a real screenshot by placing an image at `src`. Until then shows a gradient placeholder.
function PhoneMockup({
  src,
  rotate,
  className,
}: {
  src: string;
  rotate: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-center ${className ?? ""}`}>
      <div
        className={`${rotate} relative w-52 rounded-[2.5rem] border-4 border-foreground/15 shadow-2xl overflow-hidden aspect-[9/19]`}
        style={{ backgroundColor: "#f6f6f6" }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-foreground/10 z-10" />
        {src ? (
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        {/* Gradient shows through until a real screenshot is provided */}
        {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent -z-0" /> */}
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  );
}
