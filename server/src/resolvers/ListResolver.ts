import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
  InputType,
  Field,
} from "type-graphql";
import { UserList, UserListItem, UserListCollaborator } from "../types/List";
import { GraphQLContext } from "../context";
import { normalizePageOffset, normalizePageSize } from "../lib/pagination";
import {
  LIST_FULL_INCLUDE,
  LIST_CARD_INCLUDE,
  toListWithCount,
  addListVoteExtras,
  addSingleListVoteExtras,
} from "../lib/listHelpers";
import { convertContentForGraphQL } from "./content/ContentUtils";
import { processVote } from "../lib/discussionHelpers";
import { logger } from "../lib/logger";

@InputType()
export class ReorderItemInput {
  @Field(() => String)
  contentId: string;

  @Field(() => Int)
  displayOrder: number;
}

@Resolver(UserList)
export class ListResolver {
  // ======================================
  // Queries
  // ======================================

  // Kullanıcının kendi listelerini getir (sahip olduğu + işbirlikçi olduğu)
  @Authorized()
  @Query(() => [UserList])
  async myLists(@Ctx() { user, prisma }: GraphQLContext): Promise<UserList[]> {
    if (!user) throw new Error("Not authenticated");

    const ownedLists = await prisma.userList.findMany({
      where: { ownerId: user.id },
      include: LIST_FULL_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });

    const collaboratingLists = await prisma.userList.findMany({
      where: {
        collaborators: {
          some: { userId: user.id },
        },
      },
      include: LIST_FULL_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });

    // Combine and deduplicate
    const allLists = [...ownedLists, ...collaboratingLists];
    const uniqueLists = allLists.filter(
      (list, index, self) => index === self.findIndex((l) => l.id === list.id),
    );

    return uniqueLists.map(toListWithCount) as any;
  }

  // Belirli bir kullanıcının public listelerini getir
  @Query(() => [UserList])
  async userLists(
    @Arg("username", () => String) username: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList[]> {
    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) throw new Error("User not found");

    // Eğer kendi profilini görüntülüyorsa, tüm listeleri göster
    const isOwnProfile = user?.id === targetUser.id;

    const lists = await prisma.userList.findMany({
      where: {
        ownerId: targetUser.id,
        ...(isOwnProfile ? {} : { isPublic: true }),
      },
      include: LIST_FULL_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });

    return lists.map(toListWithCount) as any;
  }

  // Tek bir liste detayını getir
  @Query(() => UserList, { nullable: true })
  async list(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList | null> {
    const list = await prisma.userList.findUnique({
      where: { id },
      include: LIST_FULL_INCLUDE,
    });

    if (!list) return null;

    // Erişim kontrolü: public veya sahip veya işbirlikçi
    const isOwner = user?.id === list.ownerId;
    const isCollaborator = list.collaborators.some(
      (c) => c.userId === user?.id,
    );

    if (!list.isPublic && !isOwner && !isCollaborator) {
      throw new Error("Bu listeye erişim yetkiniz yok");
    }

    return toListWithCount(list) as any;
  }

  // Kullanıcının kaydettiği listeleri getir
  @Authorized()
  @Query(() => [UserList])
  async savedLists(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList[]> {
    if (!user) throw new Error("Not authenticated");

    // Not: Runtime'da Prisma Client modeli mevcut; ancak TS language server bazen yeni Prisma modeli için cache yüzünden type hatası gösterebiliyor.
    // Bu cast, build'i bloklamamak için burada.
    const prismaAny = prisma as any;

    const saved = await prismaAny.userSavedList.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
      include: {
        list: {
          include: LIST_FULL_INCLUDE,
        },
      },
    });

    const lists = saved.map((s: { list: any }) => s.list);

    return lists.map(toListWithCount) as any;
  }

  @Authorized()
  @Query(() => Boolean)
  async isListSaved(
    @Arg("listId", () => Int) listId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const prismaAny = prisma as any;
    const existing = await prismaAny.userSavedList.findFirst({
      where: {
        userId: user.id,
        listId,
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  // Belirli bir içeriği barındıran public listeleri getir
  @Query(() => [UserList])
  async listsContainingContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("limit", () => Int, { defaultValue: 12 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList[]> {
    const safeLimit = normalizePageSize(limit, 12);
    const safeOffset = normalizePageOffset(offset);
    const lists = await prisma.userList.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        items: {
          some: { contentId },
        },
      },
      take: safeLimit,
      skip: safeOffset,
      include: LIST_CARD_INCLUDE,
      orderBy: { upvoteCount: "desc" },
    });

    const withCount = lists.map(toListWithCount);
    const withVotes = await addListVoteExtras(prisma, withCount, user?.id);

    return withVotes as any;
  }

  // Belirli bir içeriği barındıran public listelerin sayısı
  @Query(() => Int)
  async listsContainingContentCount(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    const count = await prisma.userList.count({
      where: {
        isPublic: true,
        isDeleted: false,
        items: {
          some: { contentId },
        },
      },
    });

    return count;
  }

  // Tüm public listeleri getir (browse page)
  @Query(() => [UserList])
  async publicLists(
    @Arg("sortBy", () => String, { defaultValue: "newest" }) sortBy: string,
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | null,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList[]> {
    const safeLimit = normalizePageSize(limit, 20, 50);
    const safeOffset = normalizePageOffset(offset);
    logger.debug(
      `[publicLists] sortBy=${sortBy}, contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}`,
    );

    const where: any = {
      isPublic: true,
      isDeleted: false,
    };
    if (contentTypeId) where.contentTypeId = contentTypeId;

    let orderBy: any;
    switch (sortBy) {
      case "top":
        orderBy = { upvoteCount: "desc" as const };
        break;
      case "popular":
        // Popular = most items
        orderBy = [
          { upvoteCount: "desc" as const },
          { updatedAt: "desc" as const },
        ];
        break;
      default:
        orderBy = { createdAt: "desc" as const };
    }

    const lists = await prisma.userList.findMany({
      where,
      include: LIST_CARD_INCLUDE,
      orderBy,
      take: safeLimit,
      skip: safeOffset,
    });

    const withCount = lists.map(toListWithCount);
    const withVotes = await addListVoteExtras(prisma, withCount, user?.id);

    logger.debug(`[publicLists] Returning ${withVotes.length} lists`);
    return withVotes as any;
  }

  // ======================================
  // Mutations
  // ======================================

  // Yeni liste oluştur
  @Authorized()
  @Mutation(() => UserList)
  async createList(
    @Arg("name", () => String) name: string,
    @Arg("description", () => String, { nullable: true })
    description: string | undefined,
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Arg("isPublic", () => Boolean, { defaultValue: false }) isPublic: boolean,
    @Arg("isOrdered", () => Boolean, { defaultValue: false }) isOrdered: boolean,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList> {
    if (!user) throw new Error("Not authenticated");

    // ContentType kontrolü
    const contentType = await prisma.contentTypeLookup.findUnique({
      where: { id: contentTypeId },
    });

    if (!contentType) throw new Error("Geçersiz içerik türü");

    const list = await prisma.userList.create({
      data: {
        name,
        description,
        contentTypeId,
        ownerId: user.id,
        isPublic,
        isOrdered,
      },
      include: LIST_FULL_INCLUDE,
    });

    return toListWithCount(list) as any;
  }

  // Liste bilgilerini güncelle
  @Authorized()
  @Mutation(() => UserList)
  async updateList(
    @Arg("id", () => Int) id: number,
    @Arg("name", () => String, { nullable: true }) name: string | undefined,
    @Arg("description", () => String, { nullable: true })
    description: string | undefined,
    @Arg("isPublic", () => Boolean, { nullable: true })
    isPublic: boolean | undefined,
    @Arg("isOrdered", () => Boolean, { nullable: true })
    isOrdered: boolean | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id },
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (list.ownerId !== user.id)
      throw new Error("Bu listeyi düzenleme yetkiniz yok");

    const updatedList = await prisma.userList.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isOrdered !== undefined && { isOrdered }),
      },
      include: LIST_FULL_INCLUDE,
    });

    return toListWithCount(updatedList) as any;
  }

  // Liste sil
  @Authorized()
  @Mutation(() => Boolean)
  async deleteList(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id },
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (list.ownerId !== user.id)
      throw new Error("Bu listeyi silme yetkiniz yok");

    // Soft delete - mark as deleted instead of permanent removal
    await prisma.userList.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return true;
  }

  // Listeye içerik ekle/çıkar (toggle)
  @Authorized()
  @Mutation(() => UserListItem, { nullable: true })
  async addToList(
    @Arg("listId", () => Int) listId: number,
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserListItem | null> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
      include: { collaborators: true },
    });

    if (!list) throw new Error("Liste bulunamadı");

    // Yetki kontrolü: sahip veya editor
    const isOwner = list.ownerId === user.id;
    const isEditor = list.collaborators.some(
      (c) => c.userId === user.id && c.role === "editor",
    );

    if (!isOwner && !isEditor) {
      throw new Error("Bu listeye içerik ekleme yetkiniz yok");
    }

    // İçerik kontrolü
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) throw new Error("İçerik bulunamadı");

    if (content.contentTypeId !== list.contentTypeId) {
      throw new Error("Bu içerik türü bu listeye eklenemez");
    }

    // Daha önce eklenmiş mi kontrol et
    const existing = await prisma.userListItem.findUnique({
      where: {
        listId_contentId: {
          listId,
          contentId,
        },
      },
    });

    // Toggle: Varsa sil, yoksa ekle
    if (existing) {
      await prisma.userListItem.delete({
        where: { id: existing.id },
      });

      return null; // null = silindi
    }

    // Get max displayOrder to append at the end
    const lastItem = await prisma.userListItem.findFirst({
      where: { listId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    const nextOrder = (lastItem?.displayOrder ?? -1) + 1;

    const item = await prisma.userListItem.create({
      data: {
        listId,
        contentId,
        addedById: user.id,
        displayOrder: nextOrder,
      },
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
        addedBy: true,
      },
    });

    if (item.content) {
      item.content = convertContentForGraphQL(item.content);
    }

    return item as any;
  }

  // Listeden içerik çıkar
  @Authorized()
  @Mutation(() => Boolean)
  async removeFromList(
    @Arg("listId", () => Int) listId: number,
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
      include: { collaborators: true },
    });

    if (!list) throw new Error("Liste bulunamadı");

    // Yetki kontrolü: sahip veya editor
    const isOwner = list.ownerId === user.id;
    const isEditor = list.collaborators.some(
      (c) => c.userId === user.id && c.role === "editor",
    );

    if (!isOwner && !isEditor) {
      throw new Error("Bu listeden içerik çıkarma yetkiniz yok");
    }

    await prisma.userListItem.delete({
      where: {
        listId_contentId: {
          listId,
          contentId,
        },
      },
    });

    return true;
  }

  // Liste elemanlarını yeniden sırala
  @Authorized()
  @Mutation(() => Boolean)
  async reorderListItems(
    @Arg("listId", () => Int) listId: number,
    @Arg("items", () => [ReorderItemInput]) items: ReorderItemInput[],
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
      include: { collaborators: true },
    });

    if (!list) throw new Error("Liste bulunamadı");

    // Yetki kontrolü: sahip veya editor
    const isOwner = list.ownerId === user.id;
    const isEditor = list.collaborators.some(
      (c) => c.userId === user.id && c.role === "editor",
    );

    if (!isOwner && !isEditor) {
      throw new Error("Bu listeyi düzenleme yetkiniz yok");
    }

    // Update display orders in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.userListItem.update({
          where: {
            listId_contentId: {
              listId,
              contentId: item.contentId,
            },
          },
          data: {
            displayOrder: item.displayOrder,
          },
        })
      )
    );

    return true;
  }

  // İşbirlikçi ekle
  @Authorized()
  @Mutation(() => UserListCollaborator)
  async addCollaborator(
    @Arg("listId", () => Int) listId: number,
    @Arg("username", () => String) username: string,
    @Arg("role", () => String, { defaultValue: "editor" }) role: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserListCollaborator> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (list.ownerId !== user.id)
      throw new Error("Sadece liste sahibi işbirlikçi ekleyebilir");

    // Hedef kullanıcıyı bul
    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) throw new Error("Kullanıcı bulunamadı");
    if (targetUser.id === user.id)
      throw new Error("Kendinizi işbirlikçi olarak ekleyemezsiniz");

    // Rol kontrolü
    if (!["editor", "viewer"].includes(role)) {
      throw new Error('Geçersiz rol. "editor" veya "viewer" olmalı');
    }

    // Daha önce eklenmiş mi kontrol et
    const existing = await prisma.userListCollaborator.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      // Rolü güncelle
      const updated = await prisma.userListCollaborator.update({
        where: { id: existing.id },
        data: { role },
        include: { user: true },
      });
      return updated as any;
    }

    const collaborator = await prisma.userListCollaborator.create({
      data: {
        listId,
        userId: targetUser.id,
        role,
      },
      include: { user: true },
    });

    return collaborator as any;
  }

  // İşbirlikçi çıkar
  @Authorized()
  @Mutation(() => Boolean)
  async removeCollaborator(
    @Arg("listId", () => Int) listId: number,
    @Arg("username", () => String) username: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (list.ownerId !== user.id)
      throw new Error("Sadece liste sahibi işbirlikçi çıkarabilir");

    // Hedef kullanıcıyı bul
    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) throw new Error("Kullanıcı bulunamadı");

    await prisma.userListCollaborator.delete({
      where: {
        listId_userId: {
          listId,
          userId: targetUser.id,
        },
      },
    });

    return true;
  }

  // Listeden çıkış yap (kendini işbirlikçi olarak çıkar)
  @Authorized()
  @Mutation(() => Boolean)
  async leaveList(
    @Arg("listId", () => Int) listId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (list.ownerId === user.id)
      throw new Error("Liste sahibi listeden çıkamaz");

    await prisma.userListCollaborator.delete({
      where: {
        listId_userId: {
          listId,
          userId: user.id,
        },
      },
    });

    return true;
  }

  // Liste kaydet (bookmark)
  @Authorized()
  @Mutation(() => Boolean)
  async saveList(
    @Arg("listId", () => Int) listId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const list = await prisma.userList.findUnique({
      where: { id: listId },
      include: { collaborators: true },
    });

    if (!list) throw new Error("Liste bulunamadı");

    // Private listeler: sadece owner veya collaborator kaydedebilir
    if (!list.isPublic) {
      const isOwner = list.ownerId === user.id;
      const isCollaborator = list.collaborators.some(
        (c) => c.userId === user.id,
      );
      if (!isOwner && !isCollaborator) {
        throw new Error("Bu listeyi kaydetme yetkiniz yok");
      }
    }

    const prismaAny = prisma as any;

    await prismaAny.userSavedList.upsert({
      where: {
        userId_listId: {
          userId: user.id,
          listId,
        },
      },
      update: {
        savedAt: new Date(),
      },
      create: {
        userId: user.id,
        listId,
      },
    });

    return true;
  }

  // Liste kaydını kaldır
  @Authorized()
  @Mutation(() => Boolean)
  async unsaveList(
    @Arg("listId", () => Int) listId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const prismaAny = prisma as any;

    await prismaAny.userSavedList.deleteMany({
      where: { userId: user.id, listId },
    });

    return true;
  }

  // Liste oylaması
  @Authorized()
  @Mutation(() => UserList)
  async voteList(
    @Arg("id", () => Int) id: number,
    @Arg("voteType", () => Int) voteType: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserList> {
    if (!user) throw new Error("Not authenticated");

    if (![1, -1, 0].includes(voteType)) {
      throw new Error("Geçersiz oy tipi. 1, -1 veya 0 olmalı.");
    }

    const list = await prisma.userList.findUnique({
      where: { id },
      include: LIST_FULL_INCLUDE,
    });

    if (!list) throw new Error("Liste bulunamadı");
    if (!list.isPublic) throw new Error("Gizli listelere oy verilemez");

    // Kendi listesine oy verme kontrolü
    if (list.ownerId === user.id) {
      throw new Error("Kendi listenize oy veremezsiniz");
    }

    logger.debug(
      `[voteList] listId=${id}, userId=${user.id}, voteType=${voteType}`,
    );

    const { upvoteChange, downvoteChange } = await processVote(
      prisma,
      "userListVote",
      "listId",
      id,
      user.id,
      voteType,
    );

    const updated = await prisma.userList.update({
      where: { id },
      data: {
        upvoteCount: { increment: upvoteChange },
        downvoteCount: { increment: downvoteChange },
      },
      include: LIST_FULL_INCLUDE,
    });

    const withCount = toListWithCount(updated);
    const withVotes = await addSingleListVoteExtras(prisma, withCount, user.id);

    logger.debug(
      `[voteList] Done. score=${withVotes.score}, userVote=${withVotes.userVote}`,
    );

    return withVotes as any;
  }
}
