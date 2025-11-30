import dotenv from "dotenv";

dotenv.config();

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL,
  manusMode: toBool(process.env.MANUS_MODE, false),
  manusAuthHeader: (process.env.MANUS_AUTH_HEADER ?? "x-manus-user").toLowerCase(),
  manusWorkspaceHeader: (process.env.MANUS_WORKSPACE_HEADER ?? "x-manus-workspace").toLowerCase(),
  manusJwtSecret: process.env.MANUS_JWT_SECRET,
  manusPublicKeyUrl: process.env.MANUS_PUBLIC_KEY_URL,
  manusBaseUrl: process.env.MANUS_BASE_URL,
  mockUserEnabled: toBool(process.env.MOCK_USER_ENABLED, true),
};
