import { apiClient } from "@/api/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/unsubscribe")({
  component: Unsubscribe,
});

// One-click unsubscribe from the welcome email footer. No login required: the token in the link
// carries an HMAC, so it only ever unsubscribes the address it was minted for.
const UNSUBSCRIBE_TOKEN =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null;

function Unsubscribe() {
  const { t } = useTranslation();
  const [state, setState] = useState<"pending" | "done" | "error">("pending");

  useEffect(() => {
    if (!UNSUBSCRIBE_TOKEN) {
      setState("error");
      return;
    }
    let cancelled = false;
    apiClient
      .POST("/v1/auth/unsubscribe", { body: { token: UNSUBSCRIBE_TOKEN } })
      .then(({ error }) => {
        if (cancelled) return;
        setState(error ? "error" : "done");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-3 text-center">
        {state === "pending" && (
          <p className="text-muted-foreground text-sm">{t("unsubscribe.pending")}</p>
        )}
        {state === "done" && (
          <p className="text-sm text-green-600">{t("unsubscribe.done")}</p>
        )}
        {state === "error" && (
          <p className="text-destructive text-sm">{t("unsubscribe.error")}</p>
        )}
        <Link
          to="/dashboard"
          className="text-muted-foreground text-sm underline-offset-2 hover:underline"
        >
          {t("auth.goToDashboard")}
        </Link>
      </div>
    </div>
  );
}
