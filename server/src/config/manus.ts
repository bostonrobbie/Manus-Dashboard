import dotenv from "dotenv";

dotenv.config();

type ManusMode = "MANUS" | "LOCAL_DEV";

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const toNumber = (value: string | undefined, defaultValue: number) => {
  if (value == null) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export interface ManusConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl?: string;
  manusMode: boolean;
  manusAuthHeaderUser: string;
  manusAuthHeaderWorkspace: string;
  manusAuthHeaderRoles?: string;
  manusAuthHeaderOrg?: string;
  manusJwtSecret?: string;
  manusPublicKeyUrl?: string;
  manusBaseUrl?: string;
  mockUserEnabled: boolean;
  manusAuthStrict: boolean;
  manusAllowMockOnAuthFailure: boolean;
  authDebugEnabled: boolean;
  manusReady: boolean;
  modeLabel: ManusMode;
  warnings: string[];
}

let cachedConfig: ManusConfig | null = null;

export function loadManusConfig(): ManusConfig {
  if (cachedConfig) return cachedConfig;

  const manusModeRaw = process.env.MANUS_MODE;
  const manusMode = manusModeRaw
    ? manusModeRaw.toLowerCase() === "manus" || toBool(manusModeRaw, false)
    : false;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const manusJwtSecret = process.env.MANUS_JWT_SECRET?.trim();
  const manusPublicKeyUrl = process.env.MANUS_PUBLIC_KEY_URL?.trim();
  const manusReady = Boolean(manusJwtSecret || manusPublicKeyUrl);
  const manusAuthHeaderUser =
    (process.env.MANUS_AUTH_HEADER_USER ?? process.env.MANUS_AUTH_HEADER ?? "x-manus-user-json").toLowerCase();
  const manusAuthHeaderWorkspace =
    (process.env.MANUS_AUTH_HEADER_WORKSPACE ?? process.env.MANUS_WORKSPACE_HEADER ?? "x-manus-workspace-id").toLowerCase();
  const manusAuthHeaderRoles = process.env.MANUS_AUTH_HEADER_ROLES?.toLowerCase();
  const manusAuthHeaderOrg = process.env.MANUS_AUTH_HEADER_ORG?.toLowerCase();
  const mockUserEnabled = toBool(process.env.MOCK_USER_ENABLED, true);
  const manusAuthStrict = toBool(process.env.MANUS_AUTH_STRICT, manusMode ? true : false);
  const manusAllowMockOnAuthFailure = toBool(
    process.env.MANUS_ALLOW_MOCK_ON_AUTH_FAILURE,
    manusMode ? false : true,
  );
  const authDebugEnabled = toBool(process.env.AUTH_DEBUG_ENABLED, nodeEnv !== "production");

  const warnings: string[] = [];
  const missing: string[] = [];

  if (manusMode) {
    if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!manusAuthHeaderUser) missing.push("MANUS_AUTH_HEADER_USER");
    if (!manusAuthHeaderWorkspace) missing.push("MANUS_AUTH_HEADER_WORKSPACE");
    if (!manusReady) missing.push("MANUS_JWT_SECRET or MANUS_PUBLIC_KEY_URL");
    if (mockUserEnabled) warnings.push("MOCK_USER_ENABLED=true while MANUS_MODE is enabled");
    if (manusAllowMockOnAuthFailure)
      warnings.push("MANUS_ALLOW_MOCK_ON_AUTH_FAILURE=true while MANUS_MODE is enabled");
  }

  if (missing.length > 0) {
    throw new Error(`[config] Missing required env vars for MANUS_MODE: ${missing.join(", ")}`);
  }

  if (!process.env.DATABASE_URL) {
    warnings.push("DATABASE_URL not set; database-backed routes will be unavailable");
  }

  if (!manusReady && manusMode) {
    warnings.push("Manus JWT secret or public key URL not configured");
  }

  const modeLabel: ManusMode = manusMode ? "MANUS" : "LOCAL_DEV";

  cachedConfig = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT, 3001),
    host: process.env.HOST ?? "0.0.0.0",
    databaseUrl: process.env.DATABASE_URL,
    manusMode,
    manusAuthHeaderUser,
    manusAuthHeaderWorkspace,
    manusAuthHeaderRoles,
    manusAuthHeaderOrg,
    manusJwtSecret,
    manusPublicKeyUrl,
    manusBaseUrl: process.env.MANUS_BASE_URL?.trim(),
    mockUserEnabled,
    manusAuthStrict,
    manusAllowMockOnAuthFailure,
    authDebugEnabled,
    manusReady,
    modeLabel,
    warnings,
  };

  return cachedConfig;
}
