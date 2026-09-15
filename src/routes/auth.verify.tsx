import { apiClient } from "@/api/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth/verify")({
  component: AuthVerify,
});

// Read the token once, before anything can rewrite the URL
const VERIFY_TOKEN =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

function AuthVerify() {
  const { t } = useTranslation();
  const [state, setState] = useState<"verifying" | "verified" | "error">(
    VERIFY_TOKEN ? "verifying" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!VERIFY_TOKEN) return;
    let cancelled = false;
    apiClient
      .POST("/v1/auth/verify-email", { body: { token: VERIFY_TOKEN } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.data?.verified) {
          setErrorMessage(t("auth.linkExpired"));
          setState("error");
          return;
        }
        setState("verified");
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <p className="text-destructive text-sm">
            {errorMessage ?? t("auth.emailVerificationFailed")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("auth.verificationLinkExpiredHint")}
          </p>
          <Link
            to="/login"
            search={{ redirect: "/account" }}
            className="text-muted-foreground text-sm underline-offset-2 hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "verified") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <p className="text-sm text-green-600">{t("auth.emailVerified")}</p>
          <p className="text-muted-foreground text-sm">
            {t("auth.emailVerifiedClose")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">
        {t("auth.verifyingEmail")}
      </p>
    </div>
  );
}
