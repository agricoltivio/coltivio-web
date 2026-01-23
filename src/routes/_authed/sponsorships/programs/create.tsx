import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { PageContent } from "@/components/PageContent";
import {
  SponsorshipProgramForm,
  type SponsorshipProgramFormData,
} from "@/components/SponsorshipProgramForm";

export const Route = createFileRoute("/_authed/sponsorships/programs/create")({
  component: CreateSponsorshipProgram,
});

function formDataToApiBody(data: SponsorshipProgramFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    yearlyCost: data.yearlyCost,
  };
}

function CreateSponsorshipProgram() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: SponsorshipProgramFormData) => {
      const response = await apiClient.POST("/v1/sponsorshipPrograms", {
        body: formDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create sponsorship type");
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsorshipPrograms"] });
      navigate({ to: "/sponsorships/programs" });
    },
  });

  return (
    <PageContent title={t("sponsorshipPrograms.createType")} showBackButton>
      <SponsorshipProgramForm
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </PageContent>
  );
}
