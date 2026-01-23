import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sponsorshipProgramQueryOptions } from "@/api/sponsorshipPrograms.queries";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute(
  "/_authed/sponsorships/programs/$programId/",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      sponsorshipProgramQueryOptions(params.programId),
    );
  },
  component: SponsorshipProgramDetailPage,
});

function SponsorshipProgramDetailPage() {
  const { t } = useTranslation();
  const { programId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const typeQuery = useQuery(sponsorshipProgramQueryOptions(programId));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.DELETE(
        "/v1/sponsorshipPrograms/byId/{sponsorshipProgramId}",
        {
          params: { path: { sponsorshipProgramId: programId } },
        },
      );
      if (response.error) {
        throw new Error("Failed to delete sponsorship type");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorshipPrograms"] });
      navigate({ to: "/sponsorships/programs" });
    },
  });

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }

  if (typeQuery.isLoading) {
    return (
      <PageContent title={t("common.loading")}>
        <div className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </PageContent>
    );
  }

  if (typeQuery.error || !typeQuery.data) {
    return (
      <PageContent title={t("common.error")}>
        <div className="py-8 text-center text-destructive">
          {t("common.error")}
        </div>
      </PageContent>
    );
  }

  const sponsorshipProgram = typeQuery.data;

  return (
    <PageContent title={sponsorshipProgram.name} showBackButton>
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              to="/sponsorships/programs/$programId/edit"
              params={{ programId }}
            >
              {t("common.edit")}
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t("common.delete")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("sponsorshipPrograms.deleteConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("sponsorshipPrograms.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem
                label={t("sponsorshipPrograms.name")}
                value={sponsorshipProgram.name}
              />
              <DetailItem
                label={t("sponsorshipPrograms.yearlyCost")}
                value={formatCurrency(sponsorshipProgram.yearlyCost)}
              />
              <DetailItem
                label={t("sponsorshipPrograms.description")}
                value={sponsorshipProgram.description || "-"}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
