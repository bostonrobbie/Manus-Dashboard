import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getUploadLogById, listUploadLogs } from "../services/uploadLogs";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "../utils/timeRange";
import { protectedProcedure, requireUser, router } from "../_core/trpc";
import type { UploadLogRow } from "@shared/types/uploads";

const uploadStatus = z.enum(["pending", "success", "partial", "failed"]);
const uploadType = z.enum(["trades", "benchmarks", "equity"]);

export const uploadsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(50).default(10),
          uploadType: uploadType.optional(),
          status: uploadStatus.optional(),
          timeRange: z
            .object({
              preset: z.enum(TIME_RANGE_PRESETS),
              startDate: z.string().optional(),
              endDate: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      const params = {
        page: input?.page ?? 1,
        pageSize: input?.pageSize ?? 10,
        uploadType: input?.uploadType,
        status: input?.status,
        timeRange: input?.timeRange,
      };
      const { startDate, endDate } = deriveDateRangeFromTimeRange(params.timeRange);

      const result = await listUploadLogs({
        userId: user.id,
        page: params.page,
        pageSize: params.pageSize,
        uploadType: params.uploadType,
        status: params.status,
      });

      const filteredRows = result.rows.filter((row: UploadLogRow) => {
        if (startDate && row.startedAt && row.startedAt < new Date(`${startDate}T00:00:00.000Z`)) return false;
        if (endDate && row.startedAt && row.startedAt > new Date(`${endDate}T23:59:59.999Z`)) return false;
        return true;
      });

      return { rows: filteredRows, total: result.total };
    }),
  detail: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      const log = await getUploadLogById({ id: input.id, userId: user.id });
      if (!log) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
      }
      return log;
    }),
});
