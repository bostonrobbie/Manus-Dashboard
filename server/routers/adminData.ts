import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  listUploadsForWorkspace,
  listWorkspaceSummaries,
  softDeleteBenchmarksByFilter,
  softDeleteByUpload,
  softDeleteTradesByFilter,
} from "../services/adminData";
import { protectedProcedure, requireAdmin, router } from "../_core/trpc";

const uploadStatus = z.enum(["pending", "success", "partial", "failed"]);
const uploadType = z.enum(["trades", "benchmarks", "equity"]);
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
  listWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx as any);
    try {
      return await listWorkspaceSummaries();
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
    }
  }),

  listUploadsForWorkspace: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(25),
        uploadType: uploadType.optional(),
        status: uploadStatus.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx as any);
      try {
        return await listUploadsForWorkspace(input);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteByUpload: protectedProcedure
    .input(z.object({ uploadId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx as any);
      try {
        return await softDeleteByUpload(input.uploadId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if ((error as Error).message?.toLowerCase().includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteTradesByFilter: protectedProcedure
    .input(
      z.object({
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteTradesByFilter({ ...input, actorUserId: user.id });
        return { count };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),

  softDeleteBenchmarksByFilter: protectedProcedure
    .input(
      z.object({
        symbol: symbolSchema.optional(),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = requireAdmin(ctx as any);
      try {
        if (input.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be before or equal to endDate",
          });
        }
        const count = await softDeleteBenchmarksByFilter({ ...input, actorUserId: user.id });
        return { count };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (error as Error).message });
      }
    }),
});

export type AdminDataRouter = typeof adminDataRouter;
