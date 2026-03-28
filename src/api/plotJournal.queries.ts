import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Upload a file to plot journal: get signed URL → PUT → register */
export async function uploadPlotJournalImage(entryId: string, file: File) {
  const signedUrlRes = await apiClient.POST(
    "/v1/plots/journal/images/signedUrl",
    { body: { journalEntryId: entryId, filename: file.name } },
  );
  if (signedUrlRes.error) throw new Error("Failed to get signed URL");
  const { signedUrl, path } = signedUrlRes.data.data;
  const putRes = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Failed to upload image");
  const registerRes = await apiClient.POST("/v1/plots/journal/images", {
    body: { journalEntryId: entryId, storagePath: path },
  });
  if (registerRes.error) throw new Error("Failed to register image");
  return registerRes.data.data;
}

export const plotJournalQueryOptions = (plotId: string) =>
  queryOptions({
    queryKey: ["plotJournal", plotId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/plots/byId/{plotId}/journal", {
        params: { path: { plotId } },
      });
      if (response.error) throw new Error("Failed to fetch plot journal");
      return response.data.data.entries;
    },
  });

export const plotJournalEntryQueryOptions = (entryId: string) =>
  queryOptions({
    queryKey: ["plotJournal", "entry", entryId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/plots/journal/byId/{entryId}",
        { params: { path: { entryId } } },
      );
      if (response.error) throw new Error("Failed to fetch journal entry");
      return response.data.data;
    },
  });
