import { apiClient } from "@/api/client";
import { useAuth } from "@/context/SupabaseAuthContext";
import { supabase } from "@/lib/supabase";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/auth/confirm")({
  component: AuthConfirm,
});

// Capture hash params at module load — before Supabase's getSession() clears them.
const initialHashParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();

const HASH_ERROR = initialHashParams.get("error");
const HASH_ACCESS_TOKEN = initialHashParams.get("access_token");
const HASH_REFRESH_TOKEN = initialHashParams.get("refresh_token");
const HASH_TYPE = initialHashParams.get("type");

function AuthConfirm() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [state, setState] = useState<"verifying" | "verified" | "error">(
    HASH_ERROR ? "error" : "verifying",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    HASH_ERROR === "access_denied" ? t("auth.linkExpired") : null,
  );

  async function markVerified() {
    const { error: apiError } = await apiClient.PATCH("/v1/me", {
      body: { emailVerified: true },
    });
    if (apiError) {
      setErrorMessage(t("auth.emailVerificationFailed"));
      setState("error");
    } else {
      setState("verified");
    }
  }

  // If we captured hash tokens before Supabase cleared them, set the session manually
  useEffect(() => {
    if (HASH_ERROR || !HASH_ACCESS_TOKEN || !HASH_REFRESH_TOKEN) return;
    supabase.auth
      .setSession({ access_token: HASH_ACCESS_TOKEN, refresh_token: HASH_REFRESH_TOKEN })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setErrorMessage(sessionError.message);
          setState("error");
        }
        // markVerified() is called by the isAuthenticated effect below
      });
  }, []);

  // Once authenticated (via setSession above, or Supabase auto-processed the hash), mark verified
  useEffect(() => {
    if (!isAuthenticated || state !== "verifying") return;
    void markVerified();
  }, [isAuthenticated, state]);

  // If no tokens and no auth after 5s, the link was invalid
  useEffect(() => {
    if (HASH_ERROR || HASH_ACCESS_TOKEN) return;
    const timer = setTimeout(() => {
      setState((current) => {
        if (current === "verifying") {
          setErrorMessage(t("auth.emailVerificationFailed"));
          return "error";
        }
        return current;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive text-sm">
            {errorMessage ?? t("auth.emailVerificationFailed")}
          </p>
          <Link
            to="/login"
            search={{ redirect: "/dashboard" }}
            className="text-sm underline-offset-2 hover:underline text-muted-foreground"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "verified") {
    const successMessage =
      HASH_TYPE === "email_change" ? t("auth.emailChanged") : t("auth.emailVerified");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-green-600">{successMessage}</p>
          <Link
            to="/dashboard"
            className="text-sm underline-offset-2 hover:underline text-muted-foreground"
          >
            {t("auth.goToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">{t("auth.verifyingEmail")}</p>
    </div>
  );
}
