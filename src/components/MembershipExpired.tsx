import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";

export function MembershipExpired() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function handleRenew() {
    setLoading(true);
    try {
      const response = await apiClient.POST("/v1/membership/checkout/subscription", {
        body: {
          successUrl: `${window.location.href.split("?")[0]}?membership=success`,
          cancelUrl: window.location.href,
        },
      });
      if (response.error || !response.data) throw new Error("Checkout failed");
      window.location.href = response.data.data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-sm w-full mx-auto px-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Coltivio</h1>
        <p className="text-gray-600 mb-8">{t("membership.expired.message")}</p>
        <Button onClick={handleRenew} disabled={loading} size="lg">
          {loading ? t("common.loading") : t("membership.expired.renew")}
        </Button>
      </div>
    </div>
  );
}
