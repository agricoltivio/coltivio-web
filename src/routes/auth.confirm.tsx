import { apiClient } from "@/api/client";
import { meQueryOptions } from "@/api/user.queries";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/SupabaseAuthContext";
import { supabase } from "@/lib/supabase";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const [state, setState] = useState<
    "verifying" | "verified" | "unverified" | "error"
  >(HASH_ERROR ? "error" : "verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    HASH_ERROR === "access_denied" ? t("auth.linkExpired") : null,
  );
  const [resendState, setResendState] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

  // Old app versions still confirm through a Supabase magic link, which does not confirm the address
  // for the API. Only the profile tells whether it is confirmed.
  async function showProfileState() {
    try {
      const me = await queryClient.fetchQuery(meQueryOptions());
      setState(me.emailVerified ? "verified" : "unverified");
    } catch {
      setErrorMessage(t("auth.emailVerificationFailed"));
      setState("error");
    }
  }

  async function handleResend() {
    setResendState("pending");
    const { error } = await apiClient.POST("/v1/me/verification-email", {
      body: {},
    });
    setResendState(error ? "error" : "sent");
  }

  // If we captured hash tokens before Supabase cleared them, set the session manually
  useEffect(() => {
    if (HASH_ERROR || !HASH_ACCESS_TOKEN || !HASH_REFRESH_TOKEN) return;
    supabase.auth
      .setSession({
        access_token: HASH_ACCESS_TOKEN,
        refresh_token: HASH_REFRESH_TOKEN,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setErrorMessage(sessionError.message);
          setState("error");
        }
        // showProfileState() is called by the isAuthenticated effect below
      });
  }, []);

  // Once authenticated (via setSession above, or Supabase auto-processed the hash), check the profile
  useEffect(() => {
    if (!isAuthenticated || state !== "verifying") return;
    void showProfileState();
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

  const dashboardLink = (
    <Link
      to="/dashboard"
      className="text-sm underline-offset-2 hover:underline text-muted-foreground"
    >
      {t("auth.goToDashboard")}
    </Link>
  );

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-green-600">
            {HASH_TYPE === "email_change"
              ? t("auth.emailChanged")
              : t("auth.emailVerified")}
          </p>
          {dashboardLink}
        </div>
      </div>
    );
  }

  if (state === "unverified") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          {HASH_TYPE === "email_change" ? (
            <p className="text-sm text-green-600">{t("auth.emailChanged")}</p>
          ) : null}
          <p className="text-sm">{t("auth.emailNotYetVerified")}</p>
          {resendState === "sent" ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.verificationEmailSent")}
            </p>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={resendState === "pending"}
                onClick={handleResend}
              >
                {t("settings.resendVerification")}
              </Button>
              {resendState === "error" ? (
                <p className="text-sm text-destructive">
                  {t("settings.verificationEmailFailed")}
                </p>
              ) : null}
            </>
          )}
          <p>{dashboardLink}</p>
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
