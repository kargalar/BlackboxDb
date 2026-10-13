import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { withSoftDelete } from "./lib/softDeleteMiddleware";
import { withTranslations } from "./lib/translationMiddleware";
import { ACCESS_TOKEN_COOKIE, getCookie } from "./lib/authCookies";
import type { RequestLoaders } from "./lib/requestLoaders";
import { resolveRequestLanguage } from "./lib/requestLanguage";

export const basePrisma = new PrismaClient();
// Extended client with soft-delete filtering and translation fetching
export const prisma = withTranslations(
  withSoftDelete(basePrisma) as any,
) as unknown as PrismaClient;

export interface GraphQLContext {
  prisma: PrismaClient;
  user: {
    id: string;
    email: string;
    username: string;
    isAdmin: boolean;
    isModerator: boolean;
  } | null;
  req: Request;
  res: Response;
  language: string;
  loaders?: RequestLoaders;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<GraphQLContext> {
  // Prefer an explicit Bearer token for API clients, then fall back to the
  // HttpOnly cookie used by the web application.
  const authHeader = req.headers.authorization;
  const cookieToken = getCookie(req, ACCESS_TOKEN_COOKIE);
  let user = null;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : cookieToken;

  if (token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
        username: string;
        isAdmin: boolean;
        isModerator: boolean;
      };

      // Roles and account state are intentionally read from the database on
      // every request. JWT claims can outlive a role change or account delete.
      const currentUser = await basePrisma.appUser.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          isModerator: true,
          isDeleted: true,
        },
      });

      if (currentUser && !currentUser.isDeleted) {
        user = {
          id: currentUser.id,
          email: currentUser.email,
          username: currentUser.username,
          isAdmin: currentUser.isAdmin,
          isModerator: currentUser.isModerator,
        };
      }
    } catch (error) {
      // Token is invalid, user remains null
    }
  }

  const language = resolveRequestLanguage(req);

  return {
    prisma,
    user,
    req,
    res,
    language,
  };
}
