import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/api/client";
import { DrugForm, drugFormDataToApiBody, type DrugFormData } from "@/components/DrugForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Creates a drug without leaving the current page, so e.g. a treatment form keeps what was entered.
// Must be rendered outside other forms: React passes the submit event of the drug form up through the portal.
export function CreateDrugDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (drugId: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: DrugFormData) => {
      const response = await apiClient.POST("/v1/drugs", {
        body: drugFormDataToApiBody(data),
      });
      if (response.error) {
        throw new Error("Failed to create drug");
      }
      return response.data.data;
    },
    onSuccess: (drug) => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      onCreated(drug.id);
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // A failed attempt from earlier shouldn't show up when the dialog is opened again
        if (nextOpen) createMutation.reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("drugs.createDrug")}</DialogTitle>
        </DialogHeader>
        <DrugForm onSubmit={(data) => createMutation.mutate(data)} isSubmitting={createMutation.isPending} />
        {createMutation.isError && <p className="text-sm text-destructive">{t("common.saveFailed")}</p>}
      </DialogContent>
    </Dialog>
  );
}
