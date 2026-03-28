import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "./client";

/** Upload a file to animal journal: get signed URL → PUT → register */
export async function uploadAnimalJournalImage(entryId: string, file: File) {
  const signedUrlRes = await apiClient.POST(
    "/v1/animals/journal/images/signedUrl",
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
  const registerRes = await apiClient.POST("/v1/animals/journal/images", {
    body: { journalEntryId: entryId, storagePath: path },
  });
  if (registerRes.error) throw new Error("Failed to register image");
  return registerRes.data.data;
}

export const animalJournalQueryOptions = (animalId: string) =>
  queryOptions({
    queryKey: ["animalJournal", animalId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/byId/{animalId}/journal",
        { params: { path: { animalId } } },
      );
      if (response.error) throw new Error("Failed to fetch animal journal");
      return response.data.data.entries;
    },
  });

export const animalJournalEntryQueryOptions = (entryId: string) =>
  queryOptions({
    queryKey: ["animalJournal", "entry", entryId],
    queryFn: async () => {
      const response = await apiClient.GET(
        "/v1/animals/journal/byId/{entryId}",
        { params: { path: { entryId } } },
      );
      if (response.error) throw new Error("Failed to fetch journal entry");
      return response.data.data;
    },
  });
