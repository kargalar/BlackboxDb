import { Resolver, Mutation, Arg, Ctx } from "type-graphql";
import { AppUser } from "../types/User";
import { GraphQLContext } from "../context";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getCookie,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "../lib/authCookies";
import { permanentlyDeleteUser } from "./admin/AdminUserResolver";

// Google token verification helper
async function verifyGoogleToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
} | null> {
  try {
    // Use Google's tokeninfo endpoint to verify the token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!response.ok) {
      console.error("❌ Google token verification failed:", response.status);
      return null;
    }
    const payload = (await response.json()) as {
      aud?: string;
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    // Verify the audience (client ID) matches
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      console.error("❌ Google token audience mismatch");
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture,
    };
  } catch (error) {
    console.error("❌ Google token verification error:", error);
    return null;
  }
}

@Resolver()
export class AuthResolver {
  @Mutation(() => Boolean)
  async deleteMyAccount(
    @Ctx() { user, prisma, res }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) {
      throw new Error("Not authenticated");
    }

    await permanentlyDeleteUser(prisma, user.id);
    clearAuthCookies(res);
    return true;
  }

  @Mutation(() => AuthPayload)
  async loginWithGoogle(
    @Arg("idToken", () => String) idToken: string,
    @Ctx() { prisma, res }: GraphQLContext,
  ): Promise<AuthPayload> {
    console.log("🔐 [Auth] Google login attempt...");

    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      throw new Error(
        "Google kimlik doğrulama başarısız. Lütfen tekrar deneyin.",
      );
    }

    console.log("✅ [Auth] Google token verified for:", googleUser.email);

    // Check if user already exists with this Google ID
    let user = await prisma.appUser.findFirst({
      where: {
        OR: [{ googleId: googleUser.sub }, { email: googleUser.email }],
      },
    });

    if (user) {
      // Update googleId if user exists by email but doesn't have googleId
      if (!user.googleId) {
        user = await prisma.appUser.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub,
            authProvider: "google",
            // Update profile picture if not set
            ...(!user.picturePath && googleUser.picture
              ? { picturePath: googleUser.picture }
              : {}),
          },
        });
        console.log(
          "✅ [Auth] Linked Google account to existing user:",
          user.username,
        );
      } else {
        console.log("✅ [Auth] Existing Google user found:", user.username);
      }
    } else {
      // Create new user
      const userId = crypto.randomUUID();

      // Generate a unique username from Google name
      let baseUsername = googleUser.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (baseUsername.length < 3)
        baseUsername = googleUser.email.split("@")[0];

      let username = baseUsername;
      let counter = 1;
      while (await prisma.appUser.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.appUser.create({
        data: {
          id: userId,
          email: googleUser.email,
          username,
          googleId: googleUser.sub,
          authProvider: "google",
          picturePath: googleUser.picture || null,
          isAdmin: false,
          isModerator: false,
        },
      });
      console.log("✅ [Auth] New Google user created:", user.username);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);

    return { accessToken, refreshToken, user };
  }

  @Mutation(() => AuthPayload)
  async register(
    @Arg("email", () => String) email: string,
    @Arg("username", () => String) username: string,
    @Arg("password", () => String) password: string,
    @Ctx() { prisma, res }: GraphQLContext,
  ): Promise<AuthPayload> {
    try {
      // Validate password
      if (!password || password.length < 6) {
        const err = new Error("Şifre en az 6 karakter olmalı");

        throw err;
      }

      // Check if user exists
      const existingUser = await prisma.appUser.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          const err = new Error("Bu email adı zaten kayıtlı");

          throw err;
        }
        const err = new Error("Bu kullanıcı adı zaten alınmış");

        throw err;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate UUID for user
      const userId = crypto.randomUUID();

      // Create user
      const user = await prisma.appUser.create({
        data: {
          id: userId,
          email,
          username,
          passwordHash,
          isAdmin: false,
          isModerator: false,
        },
      });

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);
      setAuthCookies(res, accessToken, refreshToken);

      const result = {
        accessToken,
        refreshToken,
        user,
      };

      return result;
    } catch (error) {
      console.error("❌ Register error:", error);
      throw error;
    }
  }

  @Mutation(() => AuthPayload)
  async login(
    @Arg("email", () => String) email: string,
    @Arg("password", () => String) password: string,
    @Ctx() { prisma, res }: GraphQLContext,
  ): Promise<AuthPayload> {
    // Find user
    const user = await prisma.appUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Bu email adıyla bir kullanıcı bulunamadı");
    }

    if (!user.passwordHash) {
      throw new Error(
        "Kullanıcı hesabında hata oluştu. Lütfen yöneticiye başvurun",
      );
    }

    // Verify password

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new Error("Şifre yanlış");
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  @Mutation(() => AuthPayload)
  async refreshToken(
    @Arg("refreshToken", () => String, { nullable: true })
    refreshTokenArg: string | null,
    @Ctx() { prisma, req, res }: GraphQLContext,
  ): Promise<AuthPayload> {
    try {
      const refreshToken =
        refreshTokenArg || getCookie(req, REFRESH_TOKEN_COOKIE);
      if (!refreshToken) {
        throw new Error("Refresh token is missing");
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!,
      ) as { userId: string };

      const user = await prisma.appUser.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);
      setAuthCookies(res, newAccessToken, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  // Helper methods
  private generateAccessToken(user: any): string {
    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("❌ JWT_SECRET not set!");
      throw new Error("JWT_SECRET environment variable not configured");
    }

    // @ts-ignore - expiresIn type issue with jsonwebtoken types
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
      },
      secret,
      { expiresIn },
    );
  }

  private generateRefreshToken(user: any): string {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      console.error("❌ JWT_REFRESH_SECRET not set!");
      throw new Error("JWT_REFRESH_SECRET environment variable not configured");
    }

    // @ts-ignore - expiresIn type issue with jsonwebtoken types
    return jwt.sign({ userId: user.id }, secret, { expiresIn });
  }
}

// GraphQL Types
import { ObjectType, Field } from "type-graphql";

@ObjectType()
class AuthPayload {
  @Field(() => String)
  accessToken: string;

  @Field(() => String)
  refreshToken: string;

  @Field(() => AppUser)
  user: AppUser;
}
