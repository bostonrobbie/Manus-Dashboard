const fs = require("fs");
const path = require("path");
const Module = require("module");

function readJsonConfig(configPath, visited = new Set()) {
  const normalizedPath = path.resolve(configPath);
  if (!fs.existsSync(normalizedPath) || visited.has(normalizedPath)) {
    return { compilerOptions: {} };
  }

  visited.add(normalizedPath);
  const raw = fs.readFileSync(normalizedPath, "utf8");
  const parsed = JSON.parse(raw);
  let compilerOptions = parsed.compilerOptions ?? {};

  if (parsed.extends) {
    const basePath = path.resolve(path.dirname(normalizedPath), parsed.extends);
    const baseConfig = readJsonConfig(basePath, visited);
    compilerOptions = {
      ...baseConfig.compilerOptions,
      ...compilerOptions,
    };
  }

  return { compilerOptions, configPath: normalizedPath };
}

function findConfig(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, "tsconfig.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

function loadConfig(cwd = process.cwd()) {
  const configPath = findConfig(cwd);
  if (!configPath) {
    return { resultType: "failed", message: "tsconfig.json not found" };
  }

  const { compilerOptions } = readJsonConfig(configPath);
  const baseUrl = compilerOptions.baseUrl
    ? path.resolve(path.dirname(configPath), compilerOptions.baseUrl)
    : undefined;
  const paths = compilerOptions.paths;
  const outDir = compilerOptions.outDir
    ? path.resolve(path.dirname(configPath), compilerOptions.outDir)
    : undefined;

  if (!baseUrl || !paths) {
    return {
      resultType: "failed",
      message: "baseUrl or paths missing in tsconfig",
    };
  }

  return {
    resultType: "success",
    absoluteBaseUrl: baseUrl,
    compiledBaseUrl: outDir,
    paths,
  };
}

function createResolver(absoluteBaseUrl, paths, compiledBaseUrl) {
  const mappings = Object.entries(paths).map(([alias, targets]) => {
    const isWildcard = alias.endsWith("*");
    const cleanAlias = isWildcard ? alias.slice(0, -1) : alias;
    const resolvedTargets = targets.map((target) => {
      const isTargetWildcard = target.endsWith("*");
      const targetPrefix = isTargetWildcard ? target.slice(0, -1) : target;
      return {
        absolute: path.resolve(absoluteBaseUrl, targetPrefix),
        compiled: compiledBaseUrl
          ? path.resolve(compiledBaseUrl, targetPrefix)
          : undefined,
        wildcard: isTargetWildcard,
      };
    });

    return { alias, cleanAlias, targets: resolvedTargets, wildcard: isWildcard };
  });

  const tryFileCandidates = (candidate) => {
    const possibilities = [candidate, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.cjs`, `${candidate}.ts`];
    for (const possibility of possibilities) {
      if (fs.existsSync(possibility)) return possibility;
    }
    return candidate;
  };

  return (request) => {
    for (const mapping of mappings) {
      if (mapping.wildcard) {
        if (!request.startsWith(mapping.cleanAlias)) continue;
        const suffix = request.slice(mapping.cleanAlias.length);
        for (const target of mapping.targets) {
          const candidates = [target.absolute, target.compiled].filter(Boolean);
          for (const candidateBase of candidates) {
            const candidate = target.wildcard
              ? path.join(candidateBase, suffix)
              : candidateBase;
            const resolved = tryFileCandidates(candidate);
            if (fs.existsSync(resolved) || fs.existsSync(candidate)) {
              return resolved;
            }
          }
        }
      } else if (request === mapping.alias) {
        const target = mapping.targets[0];
        const bases = [target.absolute, target.compiled].filter(Boolean);
        for (const base of bases) {
          const resolved = tryFileCandidates(base);
          if (fs.existsSync(resolved) || fs.existsSync(base)) {
            return resolved;
          }
        }
      }
    }
    return undefined;
  };
}

function register(options) {
  const absoluteBaseUrl = options.absoluteBaseUrl;
  const compiledBaseUrl = options.compiledBaseUrl;
  const paths = options.paths ?? {};
  const resolveRequest = createResolver(absoluteBaseUrl, paths, compiledBaseUrl);
  const originalResolve = Module._resolveFilename;

  Module._resolveFilename = function (request, parent, isMain, options) {
    const mapped = resolveRequest(request);
    if (mapped) {
      return originalResolve.call(this, mapped, parent, isMain, options);
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };

  return () => {
    Module._resolveFilename = originalResolve;
  };
}

module.exports = {
  loadConfig,
  register,
};
