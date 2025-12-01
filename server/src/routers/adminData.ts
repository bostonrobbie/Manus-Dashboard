import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  listUploadsForWorkspace,
  listWorkspaceSummaries,
  softDeleteBenchmarks,
  softDeleteTrades,
  softDeleteUpload,
} from "@server/services/adminData";
import { authedProcedure, router } from "@server/trpc/router";
import { requireWorkspaceAccess, listAccessibleWorkspaceIds } from "@server/auth/workspaceAccess";
import { requireAdmin } from "@server/trpc/authHelpers";

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
  listWorkspaces: authedProcedure.query(async ({ ctx }) => {
    const user = requireAdmin(ctx as any);
    try {
      const ids = await listAccessibleWorkspaceIds(user);
      if (ids.size === 0) return [];
      const summaries = await listWorkspaceSummaries();
      return summaries.filter(summary => ids.has(summary.id));
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
    }
  }),

  listUploadsForWorkspace: authedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(25),
        uploadType: uploadType.optional(),
        status: uploadStatus.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        await requireWorkspaceAccess(user, "read", input.workspaceId);
        return await listUploadsForWorkspace(input);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteByUpload: authedProcedure
    .input(z.object({ uploadId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        await requireWorkspaceAccess(user, "write");
        return await softDeleteUpload(input.uploadId, user.id);
      } catch (error) {
        if ((error as Error).message?.toLowerCase().includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteTradesByFilter: authedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        await requireWorkspaceAccess(user, "write", input.workspaceId);
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteTrades({ ...input, actorUserId: user.id });
        return { count };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteBenchmarksByFilter: authedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        await requireWorkspaceAccess(user, "write", input.workspaceId);
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteBenchmarks({ ...input, actorUserId: user.id });
        return { count };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),
});

export type AdminDataRouter = typeof adminDataRouter;
