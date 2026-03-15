import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/token")({
  component: AuthTokenExchange,
});

// Capture redirect param before TanStack Router strips the hash
const INITIAL_REDIRECT =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.hash.slice(1)).get("redirect") || "/membership"
    : "/membership";

function AuthTokenExchange() {
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();

  // If Supabase hasn't authenticated after 5s, the tokens were invalid — go to login
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      void navigate({ to: INITIAL_REDIRECT });
    } else if (timedOut) {
      void navigate({ to: "/login", search: { redirect: "/dashboard" } });
    }
  }, [auth.isAuthenticated, timedOut]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );
}
