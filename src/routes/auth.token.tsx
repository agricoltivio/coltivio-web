import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/SupabaseAuthContext";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/api/client";

export const Route = createFileRoute("/auth/token")({
  component: AuthTokenExchange,
});

// Capture hash params before Supabase clears them on getSession()
const initialHashParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();

const EXCHANGE_TOKEN = initialHashParams.get("token");
const INITIAL_ACCESS_TOKEN = initialHashParams.get("access_token");
const INITIAL_REFRESH_TOKEN = initialHashParams.get("refresh_token");
const INITIAL_REDIRECT = initialHashParams.get("redirect") || "/membership";

function AuthTokenExchange() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10000);

    if (EXCHANGE_TOKEN && !sessionStorage.getItem("exchange_done")) {
      // New flow: trade short-lived handoff token for a Supabase verify URL,
      // then let Supabase redirect to the final destination with session tokens
      sessionStorage.setItem("exchange_done", "1");
      apiClient
        .POST("/v1/auth/exchange", {
          body: {
            token: EXCHANGE_TOKEN,
            redirectTo: `${window.location.origin}${INITIAL_REDIRECT}`,
          },
        })
        .then(({ data, error: exchangeError }) => {
          if (exchangeError || !data) {
            setError("Token exchange failed");
            return;
          }
          window.location.href = data.data.url;
        });
    } else if (INITIAL_ACCESS_TOKEN && INITIAL_REFRESH_TOKEN) {
      // Supabase redirected back with session tokens in hash
      supabase.auth
        .setSession({ access_token: INITIAL_ACCESS_TOKEN, refresh_token: INITIAL_REFRESH_TOKEN })
        .then(({ error: sessionError }) => {
          if (sessionError) setError(sessionError.message);
        });
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem("exchange_done");
      void navigate({ to: INITIAL_REDIRECT });
    } else if (timedOut) {
      void navigate({ to: "/login", search: { redirect: "/membership" } });
    }
  }, [isAuthenticated, timedOut]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Authenticating…</p>
    </div>
  );
}
