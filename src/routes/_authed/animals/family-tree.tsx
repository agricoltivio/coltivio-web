import { useEffect, useMemo, useRef, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useState } from "react";
import dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  animalFamilyTreeQueryOptions,
  animalsQueryOptions,
} from "@/api/animals.queries";
import type { AnimalType } from "@/api/types";
import { PageContent } from "@/components/PageContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authed/animals/family-tree")({
  validateSearch: z.object({
    type: z
      .enum(["goat", "sheep", "cow", "horse", "donkey", "pig", "deer"])
      .optional(),
    focusId: z.string().optional(),
  }),
  component: AnimalFamilyTreePage,
});

const NODE_W = 168;
const NODE_H = 110;

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

type AnimalNodeData = {
  animal: FamilyTreeNode;
  isFocused: boolean;
  isConnected: boolean;
  hasFocus: boolean;
};

type AnimalRFNode = Node<AnimalNodeData, "animal">;

function computeLayoutedElements(
  animals: FamilyTreeNode[],
  animalEdges: FamilyTreeEdge[],
  focusId: string | undefined,
  connectedIds: Set<string>,
): { nodes: AnimalRFNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 24, marginx: 32, marginy: 32 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of animals) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of animalEdges) {
    g.setEdge(edge.parentId, edge.childId);
  }

  dagre.layout(g);

  const hasFocus = !!focusId;

  const nodes: AnimalRFNode[] = animals.map((animal) => {
    const { x, y } = g.node(animal.id);
    return {
      id: animal.id,
      type: "animal",
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
      data: {
        animal,
        isFocused: animal.id === focusId,
        isConnected: connectedIds.has(animal.id),
        hasFocus,
      },
      // Prevent React Flow from moving nodes on drag
      draggable: false,
    };
  });

  const edges: Edge[] = animalEdges.map((edge) => {
    const isHighlighted =
      hasFocus && (edge.parentId === focusId || edge.childId === focusId);
    const isDimmed = hasFocus && !isHighlighted;
    return {
      id: `${edge.parentId}-${edge.childId}`,
      source: edge.parentId,
      target: edge.childId,
      style: {
        stroke: isHighlighted
          ? edge.relation === "mother"
            ? "#ec4899"
            : "#3b82f6"
          : "#cbd5e1",
        strokeWidth: isHighlighted ? 2.5 : 1.5,
        opacity: isDimmed ? 0.2 : 1,
      },
      animated: false,
    };
  });

  return { nodes, edges };
}

// Custom node component — defined outside the parent to keep nodeTypes stable
function AnimalNode({ data }: NodeProps<AnimalRFNode>) {
  const { t } = useTranslation();
  const { animal, isFocused, isConnected, hasFocus } = data;
  const isDead = !!animal.dateOfDeath;
  const referenceDate = animal.dateOfDeath
    ? new Date(animal.dateOfDeath).getTime()
    : Date.now();
  const ageYears = animal.dateOfBirth
    ? Math.floor(
        (referenceDate - new Date(animal.dateOfBirth).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  return (
    <>
    <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
    <div
      style={{
        width: NODE_W,
        opacity: hasFocus && !isFocused && !isConnected ? 0.3 : isDead ? 0.65 : 1,
        transition: "opacity 0.15s",
      }}
      className={[
        "cursor-pointer rounded-lg border bg-white p-2.5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow",
        isFocused
          ? "border-primary ring-2 ring-primary/30"
          : isConnected
            ? "border-violet-400 ring-2 ring-violet-300/40"
            : "border-slate-200",
      ].join(" ")}
    >
      <div className="text-sm font-semibold break-words leading-tight">
        {animal.name}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
          {animal.sex === "male" ? "♂" : "♀"}
        </Badge>
        {animal.earTagNumber && (
          <span className="truncate text-xs text-muted-foreground">
            {animal.earTagNumber}
          </span>
        )}
      </div>
      {ageYears !== null && (
        <div className="text-xs text-muted-foreground">
          {ageYears} {t("animals.years")}
        </div>
      )}
      {isDead && (
        <div className="text-xs text-destructive/70">{t("animals.deceased")}</div>
      )}
      {isFocused && (
        <div className="mt-1 border-t pt-1">
          <Link
            to="/animals/$animalId"
            params={{ animalId: animal.id }}
            className="text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t("animals.viewProfile")} →
          </Link>
        </div>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </>
  );
}

// Stable nodeTypes object — must not be inline to avoid React Flow warnings
const nodeTypes = { animal: AnimalNode };

// Inner canvas — has access to useReactFlow() because it's inside ReactFlowProvider
function FamilyTreeCanvas({
  nodes,
  edges,
  focusId,
  type,
  onFocus,
}: {
  nodes: AnimalRFNode[];
  edges: Edge[];
  focusId: string | undefined;
  type: string | undefined;
  onFocus: (id: string) => void;
}) {
  const { fitView } = useReactFlow();
  const lastFittedType = useRef<string | undefined>(undefined);
  // Ref so the fitView effect can read focusId without depending on it
  const focusIdRef = useRef(focusId);
  focusIdRef.current = focusId;

  useEffect(() => {
    if (nodes.length === 0) return;
    const typeChanged = type !== lastFittedType.current;
    lastFittedType.current = type;

    // Only fit when the type changes (initial load or type switch) — never on focus/deselect
    if (!typeChanged) return;

    requestAnimationFrame(() => {
      if (focusIdRef.current) {
        fitView({ nodes: [{ id: focusIdRef.current }], duration: 500, maxZoom: 1.2, padding: 0.3 });
      } else {
        fitView({ duration: 500, padding: 0.1 });
      }
    });
  }, [nodes, type, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onFocus(node.id)}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.1}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

function AnimalFamilyTreePage() {
  const { t } = useTranslation();
  const { type, focusId } = Route.useSearch();
  const navigate = useNavigate();
  const [hideDeadAnimals, setHideDeadAnimals] = useState(false);

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

  const { nodes: filteredAnimals, edges: filteredEdges } = useMemo(() => {
    if (!treeQuery.data) return { nodes: [], edges: [] };
    const allNodes = treeQuery.data.nodes;
    const allEdges = treeQuery.data.edges;
    if (!hideDeadAnimals) return { nodes: allNodes, edges: allEdges };
    const deadIds = new Set(
      allNodes.filter((n) => n.dateOfDeath !== null).map((n) => n.id),
    );
    return {
      nodes: allNodes.filter((n) => !deadIds.has(n.id)),
      edges: allEdges.filter(
        (e) => !deadIds.has(e.parentId) && !deadIds.has(e.childId),
      ),
    };
  }, [treeQuery.data, hideDeadAnimals]);

  const connectedIds = useMemo(() => {
    if (!focusId) return new Set<string>();
    const connected = new Set<string>();
    for (const edge of filteredEdges) {
      if (edge.parentId === focusId) connected.add(edge.childId);
      if (edge.childId === focusId) connected.add(edge.parentId);
    }
    return connected;
  }, [focusId, filteredEdges]);

  const onFocus = useCallback(
    (id: string) => {
      navigate({
        to: "/animals/family-tree",
        search: { type: type as AnimalType, focusId: id === focusId ? undefined : id },
        replace: true,
      });
    },
    [navigate, type, focusId],
  );

  const { nodes, edges } = useMemo(
    () =>
      filteredAnimals.length > 0
        ? computeLayoutedElements(
            filteredAnimals,
            filteredEdges,
            focusId,
            connectedIds,
          )
        : { nodes: [], edges: [] },
    // connectedIds and onFocus change with focusId, so this recalculates edge styles on focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredAnimals, filteredEdges, focusId],
  );

  function selectType(animalType: AnimalType) {
    navigate({
      to: "/animals/family-tree",
      search: { type: animalType },
      replace: true,
    });
  }

  return (
    <PageContent title={t("animals.familyTreeTitle")} showBackButton>
      {/* Controls row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {availableTypes.map((animalType) => (
          <Button
            key={animalType}
            variant={type === animalType ? "default" : "outline"}
            size="sm"
            onClick={() => selectType(animalType as AnimalType)}
          >
            {t(`animals.types.${animalType}`)}
          </Button>
        ))}
        {type && (
          <div className="ml-auto flex items-center gap-2">
            <Checkbox
              id="hideDeadAnimals"
              checked={hideDeadAnimals}
              onCheckedChange={(v) => setHideDeadAnimals(v === true)}
            />
            <Label htmlFor="hideDeadAnimals" className="text-sm font-normal">
              {t("animals.hideDeadAnimals")}
            </Label>
          </div>
        )}
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
      {type && !treeQuery.isLoading && filteredAnimals.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          {t("animals.noAnimalsOfType")}
        </div>
      )}

      {nodes.length > 0 && (
        <div
          className="rounded-lg border bg-slate-50 overflow-hidden"
          style={{ height: "calc(100vh - 220px)" }}
        >
          <ReactFlowProvider>
            <FamilyTreeCanvas
              nodes={nodes}
              edges={edges}
              focusId={focusId}
              type={type}
              onFocus={onFocus}
            />
          </ReactFlowProvider>
        </div>
      )}
    </PageContent>
  );
}
