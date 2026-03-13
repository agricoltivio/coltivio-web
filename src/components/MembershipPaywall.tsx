import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";

export function MembershipPaywall() {
  const { t } = useTranslation();
  const [loadingInterval, setLoadingInterval] = useState<"monthly" | "yearly" | null>(null);

  async function handleSubscribe(interval: "monthly" | "yearly") {
    setLoadingInterval(interval);
    try {
      const response = await apiClient.POST("/v1/membership/checkout/subscription", {
        body: {
          interval,
          successUrl: `${window.location.origin}/?membership=success`,
          cancelUrl: window.location.origin,
        },
      });
      if (response.error || !response.data) {
        throw new Error("Failed to create checkout session");
      }
      window.location.href = response.data.data.url;
    } catch {
      setLoadingInterval(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Coltivio</h1>
        <p className="text-gray-600 mb-2">{t("membership.paywall.noMembership")}</p>
        <p className="text-sm font-medium text-green-700 mb-8">{t("membership.paywall.trialInfo")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => handleSubscribe("monthly")}
            disabled={loadingInterval !== null}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            {loadingInterval === "monthly"
              ? t("common.loading")
              : t("membership.paywall.monthly")}
          </Button>
          <Button
            onClick={() => handleSubscribe("yearly")}
            disabled={loadingInterval !== null}
            size="lg"
            className="flex-1"
          >
            {loadingInterval === "yearly"
              ? t("common.loading")
              : t("membership.paywall.yearly")}
          </Button>
        </div>
      </div>
    </div>
  );
}
