import "reflect-metadata";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { buildSchema } from "type-graphql";
import * as dotenv from "dotenv";
import { graphqlUploadExpress } from "graphql-upload-minimal";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { createServer } from "http";

const getPgCommand = (cmd: "pg_dump" | "pg_restore"): string => {
  if (process.platform === "win32") {
    // Check common PostgreSQL installation paths on Windows
    for (let version = 18; version >= 10; version--) {
      const p = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\${cmd}.exe`;
      if (fs.existsSync(p)) return p;
    }
  }
  return cmd;
};

// Resolvers
import { UserResolver } from "./resolvers/UserResolver";
import { AuthResolver } from "./resolvers/AuthResolver";
import { ContentQueryResolver } from "./resolvers/content/ContentQueryResolver";
import { FilterResolver } from "./resolvers/content/FilterResolver";
import { UploadResolver } from "./resolvers/UploadResolver";
import { UserContentPreferenceResolver } from "./resolvers/UserContentPreferenceResolver";
import { AdminUserResolver } from "./resolvers/admin/AdminUserResolver";
import {
  AdminContentQueryResolver,
  AdminContentEditHistoryResolver,
} from "./resolvers/admin/AdminContentQueryResolver";
import { AdminContentMutationResolver } from "./resolvers/admin/AdminContentMutationResolver";
import { AdminModerationResolver } from "./resolvers/admin/AdminModerationResolver";
import { AdminExpansionResolver } from "./resolvers/admin/AdminExpansionResolver";
import { ContentRequestResolver } from "./resolvers/admin/ContentRequestResolver";
import { AdminTmdbResolver } from "./resolvers/admin/AdminTmdbResolver";
import { AdminAutoFillResolver } from "./resolvers/admin/AdminAutoFillResolver";
import { AppConfigResolver } from "./resolvers/admin/AppConfigResolver";
import { EpisodeResolver } from "./resolvers/EpisodeResolver";
import { PersonResolver } from "./resolvers/PersonResolver";
import {
  QuizQueryResolver,
  QuizMutationResolver,
  QuizAdminResolver,
} from "./resolvers/quiz";
import { ListResolver } from "./resolvers/ListResolver";
import { NotificationResolver } from "./resolvers/NotificationResolver";
import { RecommendationResolver } from "./resolvers/RecommendationResolver";
import { DiscussionResolver } from "./resolvers/DiscussionResolver";
import { DiscussionCommentResolver } from "./resolvers/DiscussionCommentResolver";
import { ExpansionResolver } from "./resolvers/ExpansionResolver";
import { CompanyResolver } from "./resolvers/CompanyResolver";
import { UserContentQueryResolver } from "./resolvers/userContent/UserContentQueryResolver";
import { UserContentMutationResolver } from "./resolvers/userContent/UserContentMutationResolver";
import { UserContentLogFieldsResolver } from "./resolvers/userContent/UserContentFieldResolver";
import { UserContentStatsResolver } from "./resolvers/userContent/UserContentStatsResolver";
import { LookupResolver } from "./resolvers/LookupResolver";
import { ContentTypeResolver } from "./resolvers/ContentTypeResolver";
import { ImportQueryResolver } from "./resolvers/import/ImportQueryResolver";
import { ImportMutationResolver } from "./resolvers/import/ImportMutationResolver";
import { ContributionResolver } from "./resolvers/ContributionResolver";
import { ReportResolver } from "./resolvers/ReportResolver";
import {
  ContentFieldResolver,
  PersonFieldResolver,
  CompanyFieldResolver,
} from "./resolvers/content/ContentFieldResolver";
import { DynamicListResolver } from "./resolvers/content/DynamicListResolver";
import {
  MediaVoteResolver,
  ContentImageFieldResolver,
  ContentScreenshotFieldResolver,
} from "./resolvers/MediaVoteResolver";
import { EditorPickResolver } from "./resolvers/EditorPickResolver";
import { EmotionReactionResolver } from "./resolvers/EmotionReactionResolver";

// Context
import { basePrisma, createContext, GraphQLContext } from "./context";
import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  getCookie,
} from "./lib/authCookies";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MAX_GRAPHQL_JSON_BODY_SIZE = "50mb";

function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;

  const requiredVariables = [
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "FRONTEND_URL",
  ];
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(", ")}`,
    );
  }

  for (const name of ["JWT_SECRET", "JWT_REFRESH_SECRET"]) {
    if ((process.env[name]?.length ?? 0) < 32) {
      throw new Error(`${name} must contain at least 32 characters in production`);
    }
  }
}

async function bootstrap() {
  validateProductionEnvironment();

  // Execute database setup (extensions)
  try {
    await basePrisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    console.log("✅ pg_trgm extension ensured");
  } catch (error) {
    console.error(
      "⚠️ Failed to create pg_trgm extension (this might require superuser privileges or it is already installed):",
      error,
    );
  }

  // Create Express app
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // CORS configuration
  const allowedOrigins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://localhost:3100",
    "https://localhost:3100",
    "localhost:3100",
    "http://127.0.0.1:3100",
    "https://127.0.0.1:3100",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];

  console.log("🔒 CORS Configuration:");
  console.log("  - Allowed Origins:", allowedOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    }),
  );

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "7d",
    }),
  );

  // Base64 image uploads are sent as GraphQL JSON strings, so GraphQL needs a larger
  // body limit than the rest of the API.
  app.use("/graphql", express.json({ limit: MAX_GRAPHQL_JSON_BODY_SIZE }));

  // Keep non-GraphQL JSON requests small; multipart uploads have their own limit below.
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: true }));

  // GraphQL Upload middleware - MUST be before Apollo middleware
  app.use(
    "/graphql",
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
  );

  app.post("/auth/logout", (_req, res) => {
    clearAuthCookies(res);
    res.status(204).end();
  });

  // Build TypeGraphQL schema
  const schema = await buildSchema({
    resolvers: [
      AuthResolver,
      UserResolver,
      ContentQueryResolver,
      DynamicListResolver,
      FilterResolver,
      UploadResolver,
      AdminUserResolver,
      AdminContentQueryResolver,
      AdminContentEditHistoryResolver,
      AdminContentMutationResolver,
      AdminModerationResolver,
      AdminExpansionResolver,
      EpisodeResolver,
      PersonResolver,
      QuizQueryResolver,
      QuizMutationResolver,
      QuizAdminResolver,
      ListResolver,
      NotificationResolver,
      RecommendationResolver,
      DiscussionResolver,
      DiscussionCommentResolver,
      ExpansionResolver,
      CompanyResolver,
      UserContentQueryResolver,
      UserContentMutationResolver,
      UserContentLogFieldsResolver,
      UserContentStatsResolver,
      UserContentPreferenceResolver,
      LookupResolver,
      ContentTypeResolver,
      ContributionResolver,
      ContentRequestResolver,
      AdminTmdbResolver,
      AdminAutoFillResolver,
      AppConfigResolver,
      ImportQueryResolver,
      ImportMutationResolver,
      ReportResolver,
      ContentFieldResolver,
      PersonFieldResolver,
      CompanyFieldResolver,
      MediaVoteResolver,
      ContentImageFieldResolver,
      ContentScreenshotFieldResolver,
      EditorPickResolver,
      EmotionReactionResolver,
    ],
    validate: true,
    authChecker: ({ context, info }, roles) => {
      // Simple auth checker - returns true if user exists in context
      if (!context.user) return false;

      // If roles are specified, check if user has required role
      if (roles.length > 0) {
        if (roles.includes("ADMIN") && !context.user.isAdmin) {
          return false;
        }
        if (
          roles.includes("MODERATOR") &&
          !context.user.isModerator &&
          !context.user.isAdmin
        ) {
          return false;
        }
      }

      return true;
    },
  });

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    introspection: process.env.NODE_ENV !== "production",
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
    formatError: (error) => {
      // Ignore routine authentication errors to avoid spamming the console
      // The frontend handles these gracefully by refreshing the token
      if (
        error.extensions?.code !== "UNAUTHENTICATED" &&
        error.extensions?.code !== "UNAUTHORIZED" &&
        error.message !== "Refresh token is missing" &&
        error.message !== "Invalid refresh token" &&
        error.message !==
          "Access denied! You need to be authenticated to perform this action!" &&
        error.message !==
          "Access denied! You don't have permission for this action!"
      ) {
        console.error("GraphQL Error:", error);
      }
      return error;
    },
  });

  await server.start();

  // Apply middleware
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  // ==========================================
  // STREAMING REST ENDPOINTS FOR ADMIN SYS OPS
  // ==========================================

  // Authentication middleware for REST routes
  const requireAdminREST = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      let token = "";
      // Allow API clients to use a Bearer token, while the web app uses the
      // HttpOnly access-token cookie. Tokens are intentionally never accepted
      // through query parameters because URLs are commonly logged or copied.
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
      ) {
        token = req.headers.authorization.substring(7);
      } else {
        token = getCookie(req, ACCESS_TOKEN_COOKIE) || "";
      }

      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        isAdmin: boolean;
      };

      if (!decoded.isAdmin) {
        res.status(403).json({ error: "Forbidden: Admin only" });
        return;
      }

      next();
    } catch (err) {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  app.get("/api/admin/backup", requireAdminREST, (req, res) => {
    console.log("💾 [REST] Starting DB backup stream...");
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      res.status(500).json({ error: "DATABASE_URL not configured" });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `blackboxdb-backup-${timestamp}.dump`;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const cmd = getPgCommand("pg_dump");
    // Remove query parameters like ?schema=public which pg_dump does not support
    const cleanDbUrl = dbUrl.split("?")[0];
    const pgDump = spawn(cmd, ["-d", cleanDbUrl, "-F", "c"]);

    pgDump.stdout.pipe(res);

    pgDump.stderr.on("data", (data) => {
      console.error(`[pg_dump error]: ${data}`);
    });

    pgDump.on("error", (error) => {
      console.error("❌ pg_dump spawn error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to start pg_dump" });
      } else {
        res.end();
      }
    });

    pgDump.on("close", (code) => {
      if (code === 0) {
        console.log("✅ [REST] Backup stream completed successfully.");
      } else {
        console.error(`❌ [REST] Backup failed with code ${code}`);
      }
    });
  });

  app.post("/api/admin/restore", requireAdminREST, (req, res) => {
    console.log("♻️ [REST] Starting DB restore stream from upload...");
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      res.status(500).json({ error: "DATABASE_URL not configured" });
      return;
    }

    const cmd = getPgCommand("pg_restore");
    // Remove query parameters like ?schema=public which pg_restore does not support
    const cleanDbUrl = dbUrl.split("?")[0];
    const pgRestore = spawn(cmd, [
      "-d",
      cleanDbUrl,
      "--clean",
      "--if-exists",
      "--no-owner",
    ]);

    // Pipe the raw request body directly into pg_restore stdin
    req.pipe(pgRestore.stdin);

    pgRestore.stdin.on("error", (err: any) => {
      if (err.code === "EPIPE") {
        console.warn(
          "⚠️ [REST] pg_restore closed the input stream early (EPIPE). This usually means the uploaded file is not a valid backup archive.",
        );
      } else {
        console.error("❌ pg_restore stdin error:", err);
      }
    });

    const errorLogs: string[] = [];
    pgRestore.stderr.on("data", (data) => {
      // pg_restore writes to stderr even for non-fatal warnings (like dropping tables that don't exist yet)
      const msg = data.toString();
      console.error(`[pg_restore output]: ${msg}`);
      errorLogs.push(msg);
    });

    pgRestore.on("error", (error) => {
      console.error("❌ pg_restore spawn error:", error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({
            error: "Failed to start pg_restore",
            details: error.message,
          });
      }
    });

    pgRestore.on("close", (code) => {
      if (code === 0) {
        console.log("✅ [REST] Restore completed successfully.");
        if (!res.headersSent) {
          res.status(200).json({ success: true });
        }
      } else {
        console.error(`❌ [REST] Restore failed with code ${code}`);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Restore process failed",
            details: errorLogs.join("\n"),
          });
        }
      }
    });
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  const portNumber = typeof PORT === "string" ? parseInt(PORT, 10) : PORT;
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

  const httpServer = createServer(app);

  httpServer.once("error", async (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${portNumber} is already in use on ${host}.`);
      console.error(
        `   Free it in PowerShell with: Get-NetTCPConnection -LocalAddress ${host} -LocalPort ${portNumber} | Select-Object OwningProcess`,
      );
      console.error(
        `   Or run on another port with: $env:PORT=4001; npm run dev`,
      );
    } else {
      console.error("❌ Failed to start HTTP server:", error);
    }

    await basePrisma.$disconnect();
    process.exit(1);
  });

  httpServer.listen(portNumber, host, () => {
    console.log(
      `🚀 GraphQL Server ready at http://${host}:${portNumber}/graphql`,
    );
    console.log(`🏥 Health check at http://${host}:${portNumber}/health`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n⏳ Shutting down gracefully...");
    await basePrisma.$disconnect();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Server startup error:", error);
  process.exit(1);
});
