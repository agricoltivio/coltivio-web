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
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordForm,
});

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { auth } = Route.useRouteContext();

  const form = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError(null);

    if (data.password !== data.confirmPassword) {
      setServerError(t("auth.passwordMismatch"));
      return;
    }

    const { error } = await auth.updatePassword(data.password);

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
              <p className="text-green-600 mb-4">{t("auth.passwordUpdated")}</p>
              <Link
                to="/login" search={{ redirect: "/dashboard" }}
                className="text-sm underline-offset-2 hover:underline"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          ) : (
            <form
              id="reset-password-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="p-6 md:p-8"
            >
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Coltivio</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("auth.setNewPassword")}
                  </p>
                </div>
                <Controller
                  name="password"
                  control={form.control}
                  rules={{ required: true, minLength: 6 }}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="password">
                        {t("auth.newPassword")}
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
                      ? t("auth.settingPassword")
                      : t("auth.setNewPassword")}
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
