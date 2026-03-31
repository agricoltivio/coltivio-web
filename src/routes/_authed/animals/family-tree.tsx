import { useRef, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import {
  animalFamilyTreeQueryOptions,
  animalsQueryOptions,
  animalQueryOptions,
} from "@/api/animals.queries";
import type { AnimalType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authed/animals/family-tree")({
  validateSearch: z.object({
    type: z
      .enum(["goat", "sheep", "cow", "horse", "donkey", "pig", "deer"])
      .optional(),
    focusId: z.string().optional(),
  }),
  component: AnimalFamilyTreePage,
});

const NODE_W = 160;
const NODE_H = 90;
const GAP_X = 20;
const GAP_Y = 72;

type FamilyTreeNode = {
  id: string;
  name: string;
  earTagNumber: string | null;
  dateOfBirth: string;
  dateOfDeath: string | null;
  sex: "male" | "female";
};

type FamilyTreeEdge = {
  parentId: string;
  childId: string;
  relation: "mother" | "father";
};

type LayoutResult = {
  positions: Map<string, { x: number; y: number }>;
  totalWidth: number;
  totalHeight: number;
};

// Assigns each node to the deepest possible generation (longest ancestor path)
// using Kahn's topological sort so we never recurse.
function computeLayout(
  nodes: FamilyTreeNode[],
  edges: FamilyTreeEdge[],
): LayoutResult {
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();

  for (const node of nodes) {
    parentToChildren.set(node.id, []);
    childToParents.set(node.id, []);
  }
  for (const edge of edges) {
    parentToChildren.get(edge.parentId)?.push(edge.childId);
    childToParents.get(edge.childId)?.push(edge.parentId);
  }

  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);
  for (const edge of edges) {
    inDegree.set(edge.childId, (inDegree.get(edge.childId) ?? 0) + 1);
  }

  const generation = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      generation.set(id, 0);
      queue.push(id);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const nodeId = queue[head++];
    const gen = generation.get(nodeId)!;
    for (const childId of parentToChildren.get(nodeId) ?? []) {
      const newGen = gen + 1;
      if (newGen > (generation.get(childId) ?? -1)) {
        generation.set(childId, newGen);
      }
      const newDeg = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, newDeg);
      if (newDeg === 0) {
        queue.push(childId);
      }
    }
  }

  for (const node of nodes) {
    if (!generation.has(node.id)) generation.set(node.id, 0);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const byGeneration = new Map<number, string[]>();
  for (const [id, gen] of generation) {
    if (!byGeneration.has(gen)) byGeneration.set(gen, []);
    byGeneration.get(gen)!.push(id);
  }
  for (const ids of byGeneration.values()) {
    ids.sort((a, b) => {
      const na = nodeMap.get(a);
      const nb = nodeMap.get(b);
      if (!na || !nb) return 0;
      return na.dateOfBirth.localeCompare(nb.dateOfBirth);
    });
  }

  const maxNodesInGen = Math.max(
    ...Array.from(byGeneration.values()).map((ids) => ids.length),
    1,
  );

  const totalWidth = maxNodesInGen * (NODE_W + GAP_X) - GAP_X;
  const totalHeight = byGeneration.size * (NODE_H + GAP_Y) - GAP_Y;

  const positions = new Map<string, { x: number; y: number }>();

  for (const [gen, ids] of byGeneration) {
    const rowWidth = ids.length * (NODE_W + GAP_X) - GAP_X;
    const startX = (totalWidth - rowWidth) / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_W + GAP_X),
        y: gen * (NODE_H + GAP_Y),
      });
    });
  }

  return { positions, totalWidth, totalHeight };
}

function AnimalFamilyTreePage() {
  const { t } = useTranslation();
  const { type, focusId } = Route.useSearch();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drawerAnimalId, setDrawerAnimalId] = useState<string | null>(null);

  const allAnimalsQuery = useQuery(animalsQueryOptions());
  const availableTypes = useMemo(() => {
    if (!allAnimalsQuery.data) return [];
    const seen = new Set<AnimalType>();
    for (const animal of allAnimalsQuery.data.result) seen.add(animal.type);
    return Array.from(seen);
  }, [allAnimalsQuery.data]);

  const treeQuery = useQuery({
    ...animalFamilyTreeQueryOptions(type ?? ""),
    enabled: !!type,
  });

  const layout = useMemo(() => {
    if (!treeQuery.data) return null;
    return computeLayout(treeQuery.data.nodes, treeQuery.data.edges);
  }, [treeQuery.data]);

  // Fetch full detail for the drawer animal
  const drawerQuery = useQuery({
    ...animalQueryOptions(drawerAnimalId ?? ""),
    enabled: !!drawerAnimalId,
  });

  // Scroll to focused animal after layout is ready
  useEffect(() => {
    if (!layout || !focusId || !scrollRef.current) return;
    const pos = layout.positions.get(focusId);
    if (!pos) return;
    const container = scrollRef.current;
    container.scrollTo({
      left: pos.x - container.clientWidth / 2 + NODE_W / 2,
      top: pos.y - container.clientHeight / 2 + NODE_H / 2,
      behavior: "smooth",
    });
  }, [layout, focusId]);

  const nodes = treeQuery.data?.nodes ?? [];
  const edges = treeQuery.data?.edges ?? [];

  const drawerAnimal = drawerQuery.data;

  return (
    <PageContent title={t("animals.familyTreeTitle")} showBackButton>
      {/* Type selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {availableTypes.map((animalType) => (
          <Button
            key={animalType}
            variant={type === animalType ? "default" : "outline"}
            size="sm"
            onClick={() =>
              navigate({
                to: "/animals/family-tree",
                search: { type: animalType as AnimalType },
              })
            }
          >
            {t(`animals.types.${animalType}`)}
          </Button>
        ))}
      </div>

      {!type && (
        <div className="py-16 text-center text-muted-foreground">
          {t("animals.selectTypeToView")}
        </div>
      )}

      {type && treeQuery.isLoading && (
        <div className="py-16 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {type && !treeQuery.isLoading && nodes.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          {t("animals.noAnimalsOfType")}
        </div>
      )}

      {layout && nodes.length > 0 && (
        <div
          ref={scrollRef}
          className="overflow-auto rounded-lg border bg-slate-50"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          <div
            style={{
              width: layout.totalWidth + GAP_X * 2,
              height: layout.totalHeight + GAP_Y * 2,
              position: "relative",
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              style={{
                width: layout.totalWidth + GAP_X * 2,
                height: layout.totalHeight + GAP_Y * 2,
                overflow: "visible",
              }}
            >
              {edges.map((edge) => {
                const fromPos = layout.positions.get(edge.parentId);
                const toPos = layout.positions.get(edge.childId);
                if (!fromPos || !toPos) return null;
                const x1 = fromPos.x + GAP_X + NODE_W / 2;
                const y1 = fromPos.y + GAP_Y + NODE_H;
                const x2 = toPos.x + GAP_X + NODE_W / 2;
                const y2 = toPos.y + GAP_Y;
                const midY = (y1 + y2) / 2;
                return (
                  <path
                    key={`${edge.parentId}-${edge.childId}`}
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    stroke={edge.relation === "mother" ? "#f9a8d4" : "#93c5fd"}
                    strokeWidth={1.5}
                    fill="none"
                  />
                );
              })}
            </svg>

            {nodes.map((node) => {
              const pos = layout.positions.get(node.id);
              if (!pos) return null;
              const isFocused = node.id === focusId;
              const isDead = !!node.dateOfDeath;
              const ageYears = node.dateOfBirth
                ? Math.floor(
                    (Date.now() - new Date(node.dateOfBirth).getTime()) /
                      (1000 * 60 * 60 * 24 * 365.25),
                  )
                : null;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    setDrawerAnimalId(node.id);
                    navigate({
                      to: "/animals/family-tree",
                      search: { type: type as AnimalType, focusId: node.id },
                    });
                  }}
                  style={{
                    position: "absolute",
                    left: pos.x + GAP_X,
                    top: pos.y + GAP_Y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                  className={[
                    "cursor-pointer rounded-lg border bg-white p-2.5 flex flex-col gap-1 transition-shadow hover:shadow-md",
                    isFocused
                      ? "border-primary ring-2 ring-primary/30 shadow-sm"
                      : "border-slate-200",
                    isDead ? "opacity-50" : "",
                  ].join(" ")}
                >
                  <div
                    className="truncate text-sm font-semibold"
                    title={node.name}
                  >
                    {node.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      {node.sex === "male" ? "♂" : "♀"}
                    </Badge>
                    {node.earTagNumber && (
                      <span className="truncate text-xs text-muted-foreground">
                        {node.earTagNumber}
                      </span>
                    )}
                  </div>
                  {ageYears !== null && (
                    <div className="text-xs text-muted-foreground">
                      {ageYears} {t("animals.years")}
                    </div>
                  )}
                  {isDead && (
                    <div className="text-xs text-destructive/70">
                      {t("animals.deceased")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Animal detail drawer */}
      <Sheet
        open={!!drawerAnimalId}
        onOpenChange={(open) => {
          if (!open) setDrawerAnimalId(null);
        }}
      >
        <SheetContent side="right" className="w-80 sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drawerAnimal?.name ?? t("common.loading")}
            </SheetTitle>
          </SheetHeader>

          {drawerQuery.isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          )}

          {drawerAnimal && (
            <div className="flex flex-col gap-4 px-4 py-2">
              {/* Key facts */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">{t("animals.type")}</span>
                <span>{t(`animals.types.${drawerAnimal.type}`)}</span>

                <span className="text-muted-foreground">{t("animals.sex")}</span>
                <span>{t(`animals.sexOptions.${drawerAnimal.sex}`)}</span>

                {drawerAnimal.dateOfBirth && (
                  <>
                    <span className="text-muted-foreground">{t("animals.dateOfBirth")}</span>
                    <span>{new Date(drawerAnimal.dateOfBirth).toLocaleDateString()}</span>
                  </>
                )}

                {drawerAnimal.earTag && (
                  <>
                    <span className="text-muted-foreground">{t("animals.earTag")}</span>
                    <span>{drawerAnimal.earTag.number}</span>
                  </>
                )}

                {drawerAnimal.dateOfDeath && (
                  <>
                    <span className="text-muted-foreground">{t("animals.dateOfDeath")}</span>
                    <span>{new Date(drawerAnimal.dateOfDeath).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              {/* Parents */}
              {(drawerAnimal.mother || drawerAnimal.father) && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("animals.parents")}
                  </span>
                  {drawerAnimal.mother && (
                    <button
                      className="flex items-center gap-1.5 text-sm text-left hover:underline"
                      onClick={() => {
                        setDrawerAnimalId(drawerAnimal.mother!.id);
                        navigate({
                          to: "/animals/family-tree",
                          search: { type: type as AnimalType, focusId: drawerAnimal.mother!.id },
                        });
                      }}
                    >
                      <span className="text-pink-400">♀</span>
                      {drawerAnimal.mother.name}
                    </button>
                  )}
                  {drawerAnimal.father && (
                    <button
                      className="flex items-center gap-1.5 text-sm text-left hover:underline"
                      onClick={() => {
                        setDrawerAnimalId(drawerAnimal.father!.id);
                        navigate({
                          to: "/animals/family-tree",
                          search: { type: type as AnimalType, focusId: drawerAnimal.father!.id },
                        });
                      }}
                    >
                      <span className="text-blue-400">♂</span>
                      {drawerAnimal.father.name}
                    </button>
                  )}
                </div>
              )}

              {/* Children */}
              {((drawerAnimal.childrenAsMother?.length ?? 0) +
                (drawerAnimal.childrenAsFather?.length ?? 0)) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("animals.children")}
                  </span>
                  {[
                    ...(drawerAnimal.childrenAsMother ?? []),
                    ...(drawerAnimal.childrenAsFather ?? []),
                  ]
                    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
                    .map((child) => (
                      <button
                        key={child.id}
                        className="flex items-center gap-1.5 text-sm text-left hover:underline"
                        onClick={() => {
                          setDrawerAnimalId(child.id);
                          navigate({
                            to: "/animals/family-tree",
                            search: { type: type as AnimalType, focusId: child.id },
                          });
                        }}
                      >
                        <span className="text-muted-foreground">
                          {child.sex === "male" ? "♂" : "♀"}
                        </span>
                        {child.name}
                      </button>
                    ))}
                </div>
              )}

              {/* Link to full profile */}
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/animals/$animalId"
                    params={{ animalId: drawerAnimal.id }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t("animals.viewProfile")}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageContent>
  );
}
