import fs from "fs";
import path from "path";

export interface VersionInfo {
  version: string;
  commit?: string;
}

let cachedVersionInfo: VersionInfo | null = null;

const candidatePackageJsonPaths = [
  path.resolve(process.cwd(), "package.json"),
  path.resolve(__dirname, "../../../package.json"),
  path.resolve(__dirname, "../../../../package.json"),
];

function readVersionFromPackages(): string {
  for (const pkgPath of candidatePackageJsonPaths) {
    try {
      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, "utf-8");
        const parsed = JSON.parse(content) as { version?: string };
        if (parsed.version) return parsed.version;
      }
    } catch {
      // Ignore and try the next candidate
    }
  }
  return "0.0.0-dev";
}

export function getVersionInfo(): VersionInfo {
  if (cachedVersionInfo) return cachedVersionInfo;

  cachedVersionInfo = {
    version: readVersionFromPackages(),
    commit: process.env.BUILD_COMMIT?.trim() || undefined,
  };

  return cachedVersionInfo;
}

export function refreshVersionInfo(): VersionInfo {
  cachedVersionInfo = null;
  return getVersionInfo();
}
