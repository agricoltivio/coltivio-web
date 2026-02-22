import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/api/client";

const TURNSTILE_SITE_KEY = "0x4AAAAAACgTy04qy1vutytf";
const BREVO_ACTION =
  "https://99c7cbc2.sibforms.com/serve/MUIFAKcs-LJK_AAAjKMfi9aymTyNFXgtZ5rRXL6Ux83EyD2IrUcSDUyJWRlbhkR-b-Rv1Xt3BexoJVpNrqF7LzYleIZbyqlVvmLqBS5Ak1iO4R8ezgIbOJ1yqf3Ni-A-l3yQD4OX2zCexvUE-jUFlIlew-pyNB8MTw_qHa2y0pVqZ0lq5u17_Mkzu_stGMFIox8JPgkZc982Jer_";

export function NewsletterForm() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (document.querySelector('script[src*="turnstile"]')) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const token = new FormData(e.currentTarget).get("cf-turnstile-response") as string;
    if (!token) return;

    setStatus("loading");

    try {
      // Verify Turnstile token via our backend
      const { data, error } = await apiClient.POST("/v1/captcha/verify", {
        body: { token },
      });
      if (error || !data.data.success) throw new Error("captcha failed");

      // Subscribe to Brevo
      const formData = new FormData();
      formData.append("EMAIL", email);
      formData.append("email_address_check", "");
      formData.append("locale", i18n.language.slice(0, 2));
      await fetch(BREVO_ACTION, { method: "POST", body: formData, mode: "no-cors" });

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className="text-sm font-medium text-green-600">
        {t("landing.newsletter.success")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          type="email"
          required
          placeholder={t("landing.newsletter.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "…" : t("landing.newsletter.cta")}
        </Button>
      </div>
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
      {status === "error" && (
        <p className="text-sm text-destructive">{t("landing.newsletter.error")}</p>
      )}
    </form>
  );
}
