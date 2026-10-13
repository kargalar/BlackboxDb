import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SimilarityNode = {
  nodeType: "content" | "franchise";
  nodeId: string;
};

function nodeKey(node: SimilarityNode) {
  return `${node.nodeType}:${node.nodeId}`;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(value: string) {
    if (!this.parent.has(value)) {
      this.parent.set(value, value);
    }
  }

  find(value: string): string {
    const current = this.parent.get(value);
    if (!current) {
      this.parent.set(value, value);
      return value;
    }

    if (current === value) {
      return value;
    }

    const root = this.find(current);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  values() {
    return Array.from(this.parent.keys());
  }
}

async function main() {
  const contents = await prisma.content.findMany({
    select: {
      id: true,
      franchiseId: true,
    },
  });

  const contentToNode = new Map<string, SimilarityNode>();
  for (const content of contents) {
    contentToNode.set(content.id, {
      nodeType: content.franchiseId ? "franchise" : "content",
      nodeId: content.franchiseId || content.id,
    });
  }

  const similarities = await prisma.contentSimilarity.findMany({
    select: {
      content1Id: true,
      content2Id: true,
    },
  });

  const unionFind = new UnionFind();
  const nodeMap = new Map<string, SimilarityNode>();

  for (const similarity of similarities) {
    const leftNode = contentToNode.get(similarity.content1Id);
    const rightNode = contentToNode.get(similarity.content2Id);

    if (!leftNode || !rightNode) {
      continue;
    }

    const leftKey = nodeKey(leftNode);
    const rightKey = nodeKey(rightNode);

    nodeMap.set(leftKey, leftNode);
    nodeMap.set(rightKey, rightNode);

    unionFind.add(leftKey);
    unionFind.add(rightKey);
    unionFind.union(leftKey, rightKey);
  }

  const groups = new Map<string, SimilarityNode[]>();
  for (const key of unionFind.values()) {
    const root = unionFind.find(key);
    const node = nodeMap.get(key);
    if (!node) {
      continue;
    }

    if (!groups.has(root)) {
      groups.set(root, []);
    }

    groups.get(root)!.push(node);
  }

  await prisma.$transaction(async (tx) => {
    await tx.similarityGroupItem.deleteMany({});
    await tx.similarityGroup.deleteMany({});

    for (const nodes of groups.values()) {
      const uniqueNodes = Array.from(
        new Map(nodes.map((node) => [nodeKey(node), node])).values(),
      );

      if (uniqueNodes.length <= 1) {
        continue;
      }

      await tx.similarityGroup.create({
        data: {
          items: {
            create: uniqueNodes.map((node) => ({
              nodeType: node.nodeType,
              nodeId: node.nodeId,
            })),
          },
        },
      });
    }
  });

  console.log(`Backfilled ${Array.from(groups.values()).length} similarity components.`);
}

main()
  .catch((error) => {
    console.error("Failed to backfill similarity groups:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
