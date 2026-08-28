import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { StatutenDialog } from "@/components/StatutenDialog";

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
      <span>{text}</span>
    </li>
  );
}

export function MembershipPaywall() {
  const { t } = useTranslation();
  const [statutenOpen, setStatutenOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Called after statutes acceptance — starts the Stripe checkout
  async function handleSubscribe(autoRenew: boolean) {
    setIsExecuting(true);
    setStatutenOpen(false);
    try {
      const endpoint = autoRenew
        ? "/v1/membership/checkout/subscription"
        : "/v1/membership/checkout/manual";
      const response = await apiClient.POST(endpoint, {
        body: {
          successUrl: `${window.location.href.split("?")[0]}?membership=success`,
          cancelUrl: window.location.href,
        },
      });
      if (response.error || !response.data) throw new Error("Checkout failed");
      window.location.href = response.data.data.url;
    } catch {
      setIsExecuting(false);
    }
  }

  const accessFeatures = t("membership.paywall.features.access.items", {
    returnObjects: true,
  }) as string[];
  const contributionFeatures = t("membership.paywall.features.contribution.items", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="w-full">
      <div className="max-w-2xl w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">Coltivio</h1>
          <p className="text-muted-foreground">{t("membership.paywall.noMembership")}</p>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">{t("membership.paywall.tagline")}</p>
        </div>
        {/* Feature columns */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-card rounded-lg border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("membership.paywall.features.access.title")}
            </p>
            <ul className="space-y-2">
              {accessFeatures.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </ul>
          </div>
          <div className="bg-card rounded-lg border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("membership.paywall.features.contribution.title")}
            </p>
            <ul className="space-y-2">
              {contributionFeatures.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button onClick={() => setStatutenOpen(true)} disabled={isExecuting} size="lg">
            {isExecuting ? t("common.loading") : t("membership.paywall.subscribe")}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t("membership.paywall.priceInfo")}
          </p>
        </div>
      </div>

      <StatutenDialog
        open={statutenOpen}
        onOpenChange={setStatutenOpen}
        onConfirm={handleSubscribe}
        isLoading={isExecuting}
      />
    </div>
  );
}
