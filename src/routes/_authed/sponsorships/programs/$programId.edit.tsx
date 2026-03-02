import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { sponsorshipProgramQueryOptions } from "@/api/sponsorshipPrograms.queries";
import { PageContent } from "@/components/PageContent";
import {
  SponsorshipProgramForm,
  type SponsorshipProgramFormData,
} from "@/components/SponsorshipProgramForm";

export const Route = createFileRoute(
  "/_authed/sponsorships/programs/$programId/edit",
)({
  loader: ({ params, context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      sponsorshipProgramQueryOptions(params.programId),
    );
  },
  component: EditSponsorshipProgram,
});

function formDataToApiBody(data: SponsorshipProgramFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    yearlyCost: data.yearlyCost,
  };
}

function EditSponsorshipProgram() {
  const { t } = useTranslation();
  const { programId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Data already loaded by loader
  const sponsorshipProgram = useQuery(
    sponsorshipProgramQueryOptions(programId),
  ).data!;

  const updateMutation = useMutation({
    mutationFn: async (data: SponsorshipProgramFormData) => {
      const response = await apiClient.PATCH(
        "/v1/sponsorshipPrograms/byId/{sponsorshipProgramId}",
        {
          params: { path: { sponsorshipProgramId: programId } },
          body: formDataToApiBody(data),
        },
      );
      if (response.error) {
        throw new Error("Failed to update sponsorship type");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorshipPrograms"] });
      navigate({
        to: "/sponsorships/programs/$programId",
        params: { programId },
      });
    },
  });

  return (
    <PageContent title={t("sponsorshipPrograms.editType")} showBackButton backTo={() => navigate({ to: "/sponsorships/programs/$programId", params: { programId } })}>
      <SponsorshipProgramForm
        sponsorshipProgram={sponsorshipProgram}
        onSubmit={(data) => updateMutation.mutate(data)}
        isSubmitting={updateMutation.isPending}
      />
    </PageContent>
  );
}
