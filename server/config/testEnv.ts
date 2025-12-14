export function applyTestEnvDefaults() {
  if (process.env.NODE_ENV !== "test") return;

  process.env.DATABASE_URL ??= "mysql://user:pass@localhost:3306/testdb";
  process.env.MANUS_MODE ??= "false";
  process.env.MANUS_JWT_SECRET ??= "test-secret";
  process.env.MANUS_PUBLIC_KEY_URL ??= "https://example.com/mock-key";
  process.env.MOCK_USER_ENABLED ??= "true";
  process.env.MANUS_AUTH_STRICT ??= "false";
  process.env.AUTH_DEBUG_ENABLED ??= "true";
}
