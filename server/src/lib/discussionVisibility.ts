type AccessUser =
  | {
      id: string;
      isAdmin?: boolean;
    }
  | null
  | undefined;

type DiscussionAccessTarget = {
  authorId: string;
  type: string;
  isPublic?: boolean | null;
};

export function buildVisibleCommentsWhere(user?: AccessUser) {
  if (user?.id) {
    return {
      OR: [{ isPublic: true }, { authorId: user.id }],
    };
  }

  return {
    isPublic: true,
  };
}

export function buildUserCommentsWhere(
  targetUserId: string,
  user?: AccessUser,
) {
  if (user?.isAdmin || user?.id === targetUserId) {
    return {};
  }

  return {
    isPublic: true,
  };
}

export function canAccessDiscussion(
  target: DiscussionAccessTarget,
  user?: AccessUser,
) {
  if (target.type !== "comment") {
    return true;
  }

  if (target.isPublic) {
    return true;
  }

  return Boolean(user && (user.id === target.authorId || user.isAdmin));
}

export function assertDiscussionAccess(
  target: DiscussionAccessTarget,
  user?: AccessUser,
) {
  if (!canAccessDiscussion(target, user)) {
    throw new Error("Not authorized");
  }
}
