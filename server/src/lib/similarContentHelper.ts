import { convertContentForGraphQL } from "../resolvers/content/ContentUtils";

const SIMILAR_CONTENT_INCLUDE = {
  contentType: true,
  franchise: {
    select: {
      id: true,
      name: true,
    },
  },
  images: {
    where: { type: { in: ["poster", "backdrop"] } },
    select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
  },
} as const;

type SimilarityNodeType = "content" | "franchise";

type SimilarityNode = {
  nodeType: SimilarityNodeType;
  nodeId: string;
};

type RawContent = {
  id: string;
  title: string;
  contentTypeId: number;
  releaseDate?: Date | null;
  firstAirDate?: Date | null;
  posterImageId?: number | null;
  backdropImageId?: number | null;
  franchiseId?: string | null;
  franchise?: {
    id: string;
    name: string;
  } | null;
  images?: Array<{
    id: number;
    type: string;
    filePath: string;
  }>;
};

type SimilarityGroupRecord = {
  id: string;
  items: Array<{
    nodeType: SimilarityNodeType;
    nodeId: string;
  }>;
};

function nodeKey(node: SimilarityNode) {
  return `${node.nodeType}:${node.nodeId}`;
}

function hasVisual(content: RawContent) {
  return Boolean(
    content.posterImageId ||
      content.backdropImageId ||
      content.images?.some((image) => image.type === "poster" || image.type === "backdrop"),
  );
}

function getSortableDate(content: RawContent) {
  return (
    content.releaseDate?.getTime() ??
    content.firstAirDate?.getTime() ??
    Number.MAX_SAFE_INTEGER
  );
}

function chooseRepresentative(seed: RawContent, members: RawContent[]) {
  const uniqueCandidates = new Map<string, RawContent>();

  for (const candidate of [seed, ...members]) {
    uniqueCandidates.set(candidate.id, candidate);
  }

  return Array.from(uniqueCandidates.values()).sort((a, b) => {
    const visualDiff = Number(hasVisual(b)) - Number(hasVisual(a));
    if (visualDiff !== 0) {
      return visualDiff;
    }

    const dateDiff = getSortableDate(a) - getSortableDate(b);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return a.title.localeCompare(b.title);
  })[0];
}

function buildSeriesLabel(contentTypeIds: number[]) {
  const nounMap: Record<number, string> = {
    1: "film",
    2: "dizi",
    3: "oyun",
    4: "kitap",
  };

  // Count items per content type
  const typeCounts = new Map<number, number>();
  for (const typeId of contentTypeIds) {
    typeCounts.set(typeId, (typeCounts.get(typeId) || 0) + 1);
  }

  // Build label parts sorted by type id (film → dizi → oyun → kitap)
  const parts: string[] = [];
  for (const typeId of [1, 2, 3, 4]) {
    const count = typeCounts.get(typeId);
    if (count) {
      const noun = nounMap[typeId] || "içerik";
      parts.push(`${count} ${noun}`);
    }
  }

  // Handle unknown types
  const unknownCount = contentTypeIds.filter((id) => !nounMap[id]).length;
  if (unknownCount > 0) {
    parts.push(`${unknownCount} içerik`);
  }

  return parts.join(", ");
}

async function getNodeForContentId(prisma: any, contentId: string): Promise<SimilarityNode | null> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      franchiseId: true,
    },
  });

  if (!content) {
    return null;
  }

  if (content.franchiseId) {
    return {
      nodeType: "franchise",
      nodeId: content.franchiseId,
    };
  }

  return {
    nodeType: "content",
    nodeId: content.id,
  };
}

async function getNodesForContentIds(prisma: any, contentIds: string[]) {
  const uniqueContentIds = Array.from(new Set(contentIds.filter(Boolean)));
  if (uniqueContentIds.length === 0) {
    return [];
  }

  const contents = await prisma.content.findMany({
    where: {
      id: { in: uniqueContentIds },
    },
    select: {
      id: true,
      franchiseId: true,
    },
  });

  const nodes = new Map<string, SimilarityNode>();

  for (const content of contents) {
    const node: SimilarityNode = content.franchiseId
      ? { nodeType: "franchise", nodeId: content.franchiseId }
      : { nodeType: "content", nodeId: content.id };
    nodes.set(nodeKey(node), node);
  }

  return Array.from(nodes.values());
}

async function getGroupsForNodes(prisma: any, nodes: SimilarityNode[]): Promise<SimilarityGroupRecord[]> {
  if (nodes.length === 0) {
    return [];
  }

  const groups = await prisma.similarityGroup.findMany({
    where: {
      items: {
        some: {
          OR: nodes.map((node) => ({
            nodeType: node.nodeType,
            nodeId: node.nodeId,
          })),
        },
      },
    },
    include: {
      items: {
        select: {
          nodeType: true,
          nodeId: true,
        },
      },
    },
  });

  return groups;
}

function groupContainsNode(group: SimilarityGroupRecord, node: SimilarityNode) {
  return group.items.some(
    (item) => item.nodeType === node.nodeType && item.nodeId === node.nodeId,
  );
}

async function canonicalizeNodes(prisma: any, nodes: SimilarityNode[]) {
  const dedupedInputNodes = Array.from(
    new Map(nodes.map((node) => [nodeKey(node), node])).values(),
  );

  const contentNodeIds = dedupedInputNodes
    .filter((node) => node.nodeType === "content")
    .map((node) => node.nodeId);

  const contents = contentNodeIds.length
    ? await prisma.content.findMany({
        where: {
          id: { in: contentNodeIds },
        },
        select: {
          id: true,
          franchiseId: true,
        },
      })
    : [];

  const contentMap = new Map<string, { id: string; franchiseId: string | null }>(
    (
      contents as Array<{
        id: string;
        franchiseId: string | null;
      }>
    ).map((content) => [content.id, content]),
  );

  const canonicalNodes = new Map<string, SimilarityNode>();

  for (const node of dedupedInputNodes) {
    if (node.nodeType === "franchise") {
      canonicalNodes.set(nodeKey(node), node);
      continue;
    }

    const content = contentMap.get(node.nodeId);
    if (!content) {
      continue;
    }

    const canonicalNode: SimilarityNode = content.franchiseId
      ? {
          nodeType: "franchise",
          nodeId: content.franchiseId,
        }
      : node;

    canonicalNodes.set(nodeKey(canonicalNode), canonicalNode);
  }

  return Array.from(canonicalNodes.values());
}

async function buildDisplayContentFromNode(
  prisma: any,
  node: SimilarityNode,
  options?: { useDisplayTitleAsTitle?: boolean },
) {
  if (node.nodeType === "content") {
    const content = await prisma.content.findUnique({
      where: { id: node.nodeId },
      include: SIMILAR_CONTENT_INCLUDE,
    });

    if (!content) {
      return null;
    }

    const converted = convertContentForGraphQL(content);
    return {
      ...converted,
      title: options?.useDisplayTitleAsTitle ? converted.title : converted.title,
      similarDisplayTitle: converted.title,
      similarDisplaySubtitle: null,
      similarIsFranchise: false,
      similarGroupCount: 1,
    };
  }

  const franchiseMembers = await prisma.content.findMany({
    where: {
      franchiseId: node.nodeId,
    },
    include: SIMILAR_CONTENT_INCLUDE,
  });

  if (franchiseMembers.length === 0) {
    return null;
  }

  const representative = chooseRepresentative(franchiseMembers[0], franchiseMembers);
  const converted = convertContentForGraphQL(representative);
  const franchiseName =
    representative.franchise?.name || converted.franchiseName || converted.title;
  const displayTitle = `${franchiseName} Serisi`;

  return {
    ...converted,
    title: options?.useDisplayTitleAsTitle ? displayTitle : converted.title,
    similarDisplayTitle: displayTitle,
    similarDisplaySubtitle: buildSeriesLabel(
      franchiseMembers.map((m: RawContent) => m.contentTypeId),
    ),
    similarIsFranchise: true,
    similarGroupCount: franchiseMembers.length,
  };
}

export async function resolveSimilarContents(
  prisma: any,
  content: { id: string },
  options?: { useDisplayTitleAsTitle?: boolean },
) {
  const rootNode = await getNodeForContentId(prisma, content.id);
  if (!rootNode) {
    return [];
  }

  const rootSearchNodes =
    rootNode.nodeType === "franchise"
      ? [rootNode, { nodeType: "content" as const, nodeId: content.id }]
      : [rootNode];

  const groups = await getGroupsForNodes(prisma, rootSearchNodes);
  const rootGroup = groups.find((group) =>
    rootSearchNodes.some((node) => groupContainsNode(group, node)),
  );
  if (!rootGroup) {
    return [];
  }

  const similarNodes = rootGroup.items.map((item) => ({
    nodeType: item.nodeType,
    nodeId: item.nodeId,
  }));
  const canonicalSimilarNodes = await canonicalizeNodes(prisma, similarNodes);

  const filteredSimilarNodes = canonicalSimilarNodes.filter(
    (node) => !(node.nodeType === rootNode.nodeType && node.nodeId === rootNode.nodeId),
  );

  const results = [];
  for (const node of filteredSimilarNodes) {
    const displayContent = await buildDisplayContentFromNode(prisma, node, options);
    if (displayContent) {
      results.push(displayContent);
    }
  }

  return results;
}

export async function saveSimilarityGroupForContent(
  prisma: any,
  contentId: string,
  similarContentIds: string[],
) {
  const rootNode = await getNodeForContentId(prisma, contentId);
  if (!rootNode) {
    return;
  }

  const explicitNodes = await getNodesForContentIds(
    prisma,
    similarContentIds.filter((id) => id !== contentId),
  );

  const groups = await getGroupsForNodes(prisma, [rootNode, ...explicitNodes]);
  const rootGroup = groups.find((group) => groupContainsNode(group, rootNode));
  const rootGroupId = rootGroup?.id || null;

  const finalNodes = new Map<string, SimilarityNode>();
  finalNodes.set(nodeKey(rootNode), rootNode);

  for (const node of explicitNodes) {
    finalNodes.set(nodeKey(node), node);
  }

  for (const group of groups) {
    if (group.id === rootGroupId) {
      continue;
    }

    const overlapsExplicitNode = explicitNodes.some((node) => groupContainsNode(group, node));
    if (!overlapsExplicitNode) {
      continue;
    }

    for (const item of group.items) {
      finalNodes.set(nodeKey(item), {
        nodeType: item.nodeType,
        nodeId: item.nodeId,
      });
    }
  }

  const normalizedFinalNodes = await canonicalizeNodes(
    prisma,
    Array.from(finalNodes.values()),
  );

  const affectedGroupIds = Array.from(new Set(groups.map((group) => group.id)));

  await (typeof prisma.$transaction === "function"
    ? prisma.$transaction((tx: any) => replaceSimilarityGroup(tx))
    : replaceSimilarityGroup(prisma));

  async function replaceSimilarityGroup(tx: any) {
    if (affectedGroupIds.length > 0) {
      await tx.similarityGroupItem.deleteMany({
        where: {
          groupId: { in: affectedGroupIds },
        },
      });

      await tx.similarityGroup.deleteMany({
        where: {
          id: { in: affectedGroupIds },
        },
      });
    }

    if (normalizedFinalNodes.length <= 1) {
      return;
    }

    await tx.similarityGroup.create({
      data: {
        items: {
          create: normalizedFinalNodes.map((node) => ({
            nodeType: node.nodeType,
            nodeId: node.nodeId,
          })),
        },
      },
    });
  }
}

export async function reconcileSimilarityNodeForFranchiseUpgrade(
  prisma: any,
  params: {
    contentId: string;
    previousFranchiseId?: string | null;
    nextFranchiseId?: string | null;
  },
) {
  const { contentId, previousFranchiseId, nextFranchiseId } = params;

  if (previousFranchiseId === nextFranchiseId) {
    return;
  }

  const oldNode: SimilarityNode = previousFranchiseId
    ? {
        nodeType: "franchise",
        nodeId: previousFranchiseId,
      }
    : {
        nodeType: "content",
        nodeId: contentId,
      };
  const newNode: SimilarityNode = nextFranchiseId
    ? {
        nodeType: "franchise",
        nodeId: nextFranchiseId,
      }
    : {
        nodeType: "content",
        nodeId: contentId,
      };

  const shouldReplaceOldNode =
    oldNode.nodeType === "content" && newNode.nodeType === "franchise";

  const groups = await getGroupsForNodes(prisma, [oldNode, newNode]);
  const oldGroup = groups.find((group) => groupContainsNode(group, oldNode));
  const newGroup = groups.find((group) => groupContainsNode(group, newNode));

  if (!oldGroup) {
    return;
  }

  if (!newGroup) {
    if (shouldReplaceOldNode) {
      await prisma.similarityGroupItem.updateMany({
        where: {
          groupId: oldGroup.id,
          nodeType: oldNode.nodeType,
          nodeId: oldNode.nodeId,
        },
        data: {
          nodeType: newNode.nodeType,
          nodeId: newNode.nodeId,
        },
      });
    } else {
      await prisma.similarityGroupItem.create({
        data: {
          groupId: oldGroup.id,
          nodeType: newNode.nodeType,
          nodeId: newNode.nodeId,
        },
      });
    }
    return;
  }

  if (oldGroup.id === newGroup.id) {
    if (shouldReplaceOldNode) {
      await prisma.similarityGroupItem.deleteMany({
        where: {
          groupId: oldGroup.id,
          nodeType: oldNode.nodeType,
          nodeId: oldNode.nodeId,
        },
      });
    }
    return;
  }

  const mergedNodes = new Map<string, SimilarityNode>();

  for (const group of [oldGroup, newGroup]) {
    for (const item of group.items) {
      const normalizedNode =
        shouldReplaceOldNode &&
        item.nodeType === oldNode.nodeType &&
        item.nodeId === oldNode.nodeId
          ? newNode
          : { nodeType: item.nodeType, nodeId: item.nodeId };
      mergedNodes.set(nodeKey(normalizedNode), normalizedNode);
    }
  }

  await (typeof prisma.$transaction === "function"
    ? prisma.$transaction((tx: any) => mergeSimilarityGroups(tx))
    : mergeSimilarityGroups(prisma));

  async function mergeSimilarityGroups(tx: any) {
    await tx.similarityGroupItem.deleteMany({
      where: {
        groupId: { in: [oldGroup.id, newGroup.id] },
      },
    });

    await tx.similarityGroup.deleteMany({
      where: {
        id: { in: [oldGroup.id, newGroup.id] },
      },
    });

    if (mergedNodes.size <= 1) {
      return;
    }

    await tx.similarityGroup.create({
      data: {
        items: {
          create: Array.from(mergedNodes.values()).map((node) => ({
            nodeType: node.nodeType,
            nodeId: node.nodeId,
          })),
        },
      },
    });
  }
}
