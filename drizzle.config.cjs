const dotenv = require("dotenv");
const { defineConfig } = require("drizzle-kit");
const path = require("node:path");

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Drizzle configuration");
}

const baseDir = __dirname;
const schemaPath = path.resolve(baseDir, "drizzle/schema.ts");
const migrationsPath = path.resolve(baseDir, "drizzle/migrations");

module.exports = defineConfig({
  schema: schemaPath,
  out: migrationsPath,
  dialect: "mysql",
  dbCredentials: {
    url: databaseUrl,
  },
});
