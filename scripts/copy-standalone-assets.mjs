import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = join(projectRoot, ".next", "standalone");
const staticSource = join(projectRoot, ".next", "static");
const publicSource = join(projectRoot, "public");

function findStandaloneServer(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isFile() && entry === "server.js") {
      return fullPath;
    }

    if (stats.isDirectory()) {
      const result = findStandaloneServer(fullPath);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

if (!existsSync(standaloneRoot)) {
  console.warn("[postbuild] Standalone output not found, skipping asset copy.");
  process.exit(0);
}

const serverPath = findStandaloneServer(standaloneRoot);

if (!serverPath) {
  console.warn("[postbuild] Standalone server.js not found, skipping asset copy.");
  process.exit(0);
}

const appStandaloneRoot = dirname(serverPath);
const staticDestinationParent = join(appStandaloneRoot, ".next");
const staticDestination = join(staticDestinationParent, "static");
const publicDestination = join(appStandaloneRoot, "public");

mkdirSync(staticDestinationParent, { recursive: true });

if (existsSync(staticSource)) {
  rmSync(staticDestination, { recursive: true, force: true });
  cpSync(staticSource, staticDestination, { recursive: true });
}

if (existsSync(publicSource)) {
  rmSync(publicDestination, { recursive: true, force: true });
  cpSync(publicSource, publicDestination, { recursive: true });
}

console.log(`[postbuild] Copied static assets into ${appStandaloneRoot}`);
