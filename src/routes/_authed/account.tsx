import { apiClient } from "@/api/client";
import { meQueryOptions } from "@/api/user.queries";
import { PageContent } from "@/components/PageContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authed/account")({
  component: Account,
});

function Account() {
  const { t } = useTranslation();
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();
  const meQuery = useQuery(meQueryOptions());

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [changeEmailState, setChangeEmailState] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [verifyState, setVerifyState] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

  const emailForm = useForm<{ email: string }>({
    defaultValues: { email: auth.user?.email ?? "" },
  });

  async function handleLogout() {
    await auth.signOut();
    navigate({ to: "/login", search: { redirect: "/dashboard" } });
  }

  async function onChangeEmail({ email }: { email: string }) {
    setChangeEmailState("pending");
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    );
    if (error) {
      setChangeEmailState("error");
      emailForm.setError("email", { message: error.message });
      return;
    }
    // Mark email as unverified in our API while the new address is pending confirmation
    await apiClient.PATCH("/v1/me", { body: { emailVerified: false } });
    setChangeEmailState("sent");
    setShowChangeEmail(false);
  }

  async function handleSendVerification() {
    if (!auth.user?.email) return;
    setVerifyState("pending");
    const { error } = await supabase.auth.signInWithOtp({
      email: auth.user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setVerifyState(error ? "error" : "sent");
  }

  const emailVerified = meQuery.data?.emailVerified ?? true;

  return (
    <PageContent title={t("settings.title")}>
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("settings.account")}</h2>
        <div className="space-y-4 max-w-md">

          {/* Email display + verification status */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("auth.email")}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{auth.user?.email}</p>
              {emailVerified ? (
                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                  {t("settings.emailVerified")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                  {t("settings.emailNotVerifiedBadge")}
                </Badge>
              )}
            </div>
          </div>

          {/* Not verified: send verification email */}
          {!emailVerified && (
            <div className="space-y-2">
              {verifyState === "sent" ? (
                <p className="text-sm text-muted-foreground">
                  {t("settings.verificationEmailSent")}
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={verifyState === "pending"}
                  onClick={handleSendVerification}
                >
                  {t("settings.resendVerification")}
                </Button>
              )}
            </div>
          )}

          {/* Change email */}
          {changeEmailState === "sent" ? (
            <p className="text-sm text-muted-foreground">
              {t("settings.changeEmailSent")}
            </p>
          ) : showChangeEmail ? (
            <form onSubmit={emailForm.handleSubmit(onChangeEmail)}>
              <FieldGroup>
                <Controller
                  name="email"
                  control={emailForm.control}
                  rules={{ required: true }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="email">{t("settings.newEmail")}</FieldLabel>
                      <Input {...field} id="email" type="email" required />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !emailForm.formState.isDirty ||
                      changeEmailState === "pending"
                    }
                  >
                    {t("settings.changeEmail")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeEmail(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeEmail(true)}
            >
              {t("settings.changeEmail")}
            </Button>
          )}

          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t("common.signOut")}
          </Button>
        </div>
      </div>
    </PageContent>
  );
}
