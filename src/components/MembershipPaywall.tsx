import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type CheckoutFlow = "subscription";

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
  const queryClient = useQueryClient();
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<CheckoutFlow | null>(null);

  async function handleTrial() {
    setLoadingTrial(true);
    try {
      const response = await apiClient.POST("/v1/membership/trial", { body: {} });
      if (response.error) throw new Error("Failed to activate trial");
      await queryClient.invalidateQueries({ queryKey: ["farm"] });
    } catch {
      setLoadingTrial(false);
    }
  }

  async function handleCheckout(flow: CheckoutFlow) {
    setLoadingCheckout(flow);
    try {
      const successUrl = `${window.location.href.split("?")[0]}?membership=success`;
      const cancelUrl = window.location.href;
      const response = await apiClient.POST("/v1/membership/checkout/subscription", {
        body: { successUrl, cancelUrl },
      });
      if (response.error || !response.data) throw new Error("Checkout failed");
      window.location.href = response.data.data.url;
    } catch {
      setLoadingCheckout(null);
    }
  }

  const anyLoading = loadingTrial || loadingCheckout !== null;

  const appFeatures = t("membership.paywall.features.app.items", {
    returnObjects: true,
  }) as string[];
  const webFeatures = t("membership.paywall.features.web.items", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-2xl w-full mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Coltivio</h1>
          <p className="text-gray-600">{t("membership.paywall.noMembership")}</p>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">{t("membership.paywall.tagline")}</p>
        </div>

        {/* Feature columns */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-lg border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("membership.paywall.features.app.title")}
            </p>
            <ul className="space-y-2">
              {appFeatures.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t("membership.paywall.features.web.title")}
            </p>
            <ul className="space-y-2">
              {webFeatures.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button onClick={handleTrial} disabled={anyLoading} size="lg">
            {loadingTrial ? t("common.loading") : t("membership.paywall.startTrial")}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t("membership.paywall.trialInfo")}
          </p>
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-2 text-xs text-muted-foreground">
                {t("membership.paywall.or")}
              </span>
            </div>
          </div>
          <Button
            onClick={() => handleCheckout("subscription")}
            disabled={anyLoading}
            size="lg"
            variant="outline"
          >
            {loadingCheckout === "subscription"
              ? t("common.loading")
              : t("membership.paywall.subscribe")}
          </Button>
        </div>
      </div>
    </div>
  );
}
