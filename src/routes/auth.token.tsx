import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/token")({
  validateSearch: (search) => ({
    access_token: (search.access_token as string) ?? "",
    refresh_token: (search.refresh_token as string) ?? "",
    redirect: (search.redirect as string) || "/membership",
  }),
  component: AuthTokenExchange,
});

function AuthTokenExchange() {
  const { access_token, refresh_token, redirect } = Route.useSearch();
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Call setSession once on mount. onAuthStateChange in AuthProvider fires
  // → isAuthenticated becomes true → App's useEffect calls router.invalidate().
  useEffect(() => {
    if (!access_token || !refresh_token) {
      setError("Missing tokens");
      return;
    }
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) setError(sessionError.message);
      });
  }, []);

  // Navigate once auth state is confirmed
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate({ to: redirect });
    }
  }, [auth.isAuthenticated]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}
