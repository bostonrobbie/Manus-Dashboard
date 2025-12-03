import { env } from "../utils/env";
import { publicProcedure, router } from "../_core/trpc";

const isSensitive = (name: string) => /authorization|token|cookie|secret/i.test(name);

const maskHeaderValue = (name: string, value: unknown) => {
  if (value == null) return value;
  if (isSensitive(name)) return "[masked]";
  if (Array.isArray(value)) return value.map(v => (isSensitive(name) ? "[masked]" : v));
  return value;
};

export const authRouter = router({
  viewer: publicProcedure.query(({ ctx }) => ({
    user: ctx.user,
    mode: ctx.auth.mode,
    mock: ctx.auth.mock,
    fallbackUsed: ctx.auth.fallbackUsed,
    strict: ctx.auth.strict,
  })),
  debug: publicProcedure.query(({ ctx }) => {
    const debugAllowed = env.authDebugEnabled || env.nodeEnv !== "production";
    if (!debugAllowed) {
      return { enabled: false };
    }

    const headers = Object.entries(ctx.req.headers ?? {})
      .filter(([name]) => name.startsWith("x-") || !isSensitive(name))
      .reduce<Record<string, unknown>>((acc, [name, value]) => {
        acc[name] = maskHeaderValue(name, value);
        return acc;
      }, {});

    return {
      enabled: true,
      mode: env.modeLabel,
      rawHeaders: headers,
      parsedUser: ctx.user,
      configAuthHeaders: {
        user: env.manusAuthHeaderUser,
        roles: env.manusAuthHeaderRoles,
        org: env.manusAuthHeaderOrg,
      },
      fallbackUsed: ctx.auth.fallbackUsed,
      strict: ctx.auth.strict,
    };
  }),
});
