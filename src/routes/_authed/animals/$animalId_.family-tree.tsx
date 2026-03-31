import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { animalQueryOptions } from "@/api/animals.queries";

export const Route = createFileRoute("/_authed/animals/$animalId_/family-tree")({
  component: FamilyTreeRedirect,
});

// Redirect to the full-type family tree view, focused on this animal.
// The animal is almost always cached from the detail page so this is instant.
function FamilyTreeRedirect() {
  const { animalId } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useQuery(animalQueryOptions(animalId));

  useEffect(() => {
    if (!data) return;
    navigate({
      to: "/animals/family-tree",
      search: { type: data.type, focusId: animalId },
      replace: true,
    });
  }, [data, animalId, navigate]);

  return null;
}
