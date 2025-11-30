import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isAdmin } from "@server/auth/roles";
import {
  listUploadsForWorkspace,
  listWorkspaceSummaries,
  softDeleteBenchmarks,
  softDeleteTrades,
  softDeleteUpload,
} from "@server/services/adminData";
import { authedProcedure, router } from "@server/trpc/router";

const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!isAdmin(ctx.user)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin privileges required" });
  }
  return next();
});

const uploadStatus = z.enum(["pending", "success", "partial", "failed"]);
const uploadType = z.enum(["trades", "benchmarks", "equity"]);
const workspaceIdSchema = z.number().int().positive();
const dateSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  .describe("Date in YYYY-MM-DD format");
const symbolSchema = z
  .string()
  .trim()
  .min(1, "Symbol is required")
  .max(32, "Symbol is too long")
  .regex(/^[\w.-]+$/, "Symbol may only include letters, numbers, dashes, underscores, or dots");

export const adminDataRouter = router({
  listWorkspaces: adminProcedure.query(async () => {
    try {
      return await listWorkspaceSummaries();
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
    }
  }),

  listUploadsForWorkspace: adminProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(25),
        uploadType: uploadType.optional(),
        status: uploadStatus.optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await listUploadsForWorkspace(input);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteByUpload: adminProcedure
    .input(z.object({ uploadId: z.number().int() }))
    .mutation(async ({ input }) => {
      try {
        return await softDeleteUpload(input.uploadId);
      } catch (error) {
        if ((error as Error).message?.toLowerCase().includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteTradesByFilter: adminProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteTrades(input);
        return { count };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteBenchmarksByFilter: adminProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteBenchmarks(input);
        return { count };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),
});

export type AdminDataRouter = typeof adminDataRouter;
