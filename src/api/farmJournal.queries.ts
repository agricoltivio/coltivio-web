import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Upload a file to farm journal: get signed URL → PUT → register */
export async function uploadFarmJournalImage(entryId: string, file: File) {
  const signedUrlRes = await apiClient.POST(
    "/v1/farm/journal/images/signedUrl",
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
  const registerRes = await apiClient.POST("/v1/farm/journal/images", {
    body: { journalEntryId: entryId, storagePath: path },
  });
  if (registerRes.error) throw new Error("Failed to register image");
  return registerRes.data.data;
}

export const farmJournalQueryOptions = () =>
  queryOptions({
    queryKey: ["farmJournal"],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/journal");
      if (response.error) throw new Error("Failed to fetch farm journal");
      return response.data.data.entries;
    },
  });

export const farmJournalEntryQueryOptions = (entryId: string) =>
  queryOptions({
    queryKey: ["farmJournal", "entry", entryId],
    queryFn: async () => {
      const response = await apiClient.GET("/v1/farm/journal/byId/{entryId}", {
        params: { path: { entryId } },
      });
      if (response.error) throw new Error("Failed to fetch journal entry");
      return response.data.data;
    },
  });
