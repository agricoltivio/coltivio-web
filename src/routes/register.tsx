import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { privacyPolicyUrl } from "@/lib/links";
import { cn } from "@/lib/utils";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  newsletterConsent: boolean;
}

export const Route = createFileRoute("/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RegisterForm,
});

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t, i18n } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { auth } = Route.useRouteContext();

  const form = useForm<RegisterFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      newsletterConsent: false,
    },
  });

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);

    if (data.password !== data.confirmPassword) {
      setServerError(t("auth.passwordMismatch"));
      return;
    }

    const { error } = await auth.signUp(data.email, data.password, data.fullName);

    if (error) {
      setServerError(error.message);
      return;
    }
    if (data.newsletterConsent) {
      await apiClient.PATCH("/v1/me", { body: { newsletterConsent: true } });
    }
    await apiClient.POST("/v1/me/verification-email", { body: {} });
    setSuccess(true);
  }

  return (
    <div
      className={cn("flex min-h-screen items-center justify-center", className)}
      {...props}
    >
      <Card className="w-full max-w-sm overflow-hidden p-0">
        <CardContent>
          {success ? (
            <div className="p-6 md:p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Coltivio</h1>
              <p className="text-green-600 mb-4">{t("auth.signUpSuccess")}</p>
              <Link
                to="/login" search={{ redirect: "/dashboard" }}
                className="text-sm underline-offset-2 hover:underline"
              >
                {t("auth.signIn")}
              </Link>
            </div>
          ) : (
            <form
              id="register-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 md:p-8"
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Coltivio</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("auth.signUp")}
                  </p>
                </div>
                <Controller
                  name="fullName"
                  control={form.control}
                  rules={{ required: true }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="fullName">{t("auth.fullName")}</FieldLabel>
                      <Input
                        {...field}
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        required
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="email"
                  control={form.control}
                  rules={{ required: true }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="email">{t("auth.email")}</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        placeholder="mail@example.com"
                        required
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  rules={{ required: true, minLength: 6 }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="password">
                        {t("auth.password")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        required
                        minLength={6}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  rules={{ required: true }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="confirmPassword">
                        {t("auth.confirmPassword")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="confirmPassword"
                        type="password"
                        required
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="newsletterConsent"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="newsletterConsent"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                        <label
                          htmlFor="newsletterConsent"
                          className="text-sm text-muted-foreground leading-snug"
                        >
                          {t("auth.newsletterConsent")}{" "}
                          <a
                            href={privacyPolicyUrl(i18n.language)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            {t("auth.privacyPolicy")}
                          </a>
                        </label>
                      </div>
                    </Field>
                  )}
                />
                {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
                )}
                <Field>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="w-full"
                  >
                    {form.formState.isSubmitting
                      ? t("auth.signingUp")
                      : t("auth.signUp")}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  {t("auth.haveAccount")}{" "}
                  <Link
                    to="/login" search={{ redirect: "/dashboard" }}
                    className="underline-offset-2 hover:underline"
                  >
                    {t("auth.signIn")}
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
