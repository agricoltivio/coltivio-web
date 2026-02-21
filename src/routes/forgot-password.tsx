import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ForgotPasswordFormData {
  email: string;
}

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ForgotPasswordForm,
});

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { auth } = Route.useRouteContext();

  const form = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setServerError(null);

    const { error } = await auth.resetPassword(data.email);

    if (error) {
      setServerError(error.message);
    } else {
      setSuccess(true);
    }
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
              <p className="text-green-600 mb-4">{t("auth.resetLinkSent")}</p>
              <Link
                to="/login" search={{ redirect: "/dashboard" }}
                className="text-sm underline-offset-2 hover:underline"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          ) : (
            <form
              id="forgot-password-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 md:p-8"
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Coltivio</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("auth.resetPassword")}
                  </p>
                </div>
                <FieldDescription>
                  {t("auth.resetPasswordDescription")}
                </FieldDescription>
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
                      ? t("auth.sending")
                      : t("auth.sendResetLink")}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  <Link
                    to="/login" search={{ redirect: "/dashboard" }}
                    className="underline-offset-2 hover:underline"
                  >
                    {t("auth.backToLogin")}
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
