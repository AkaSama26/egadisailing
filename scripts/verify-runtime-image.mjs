import {
  accessSync,
  constants,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const prismaEngine =
  "/app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x";

const requiredPaths = [
  "/app/server.js",
  "/app/prisma.config.ts",
  "/app/prisma/migrations/20260719120000_email_outbox_resolution/migration.sql",
  "/app/deploy/prepare-email-rollback.mjs",
  "/app/node_modules/prisma/build/index.js",
  prismaEngine,
];

const forbiddenPaths = [
  "/app/.git",
  "/app/private",
  "/app/backup",
  "/app/backups",
  "/app/prisma/backup",
  "/app/outreach-data",
  "/app/contact-ledgers",
  "/app/scripts/send-partner-emails.mjs",
  "/app/docs/partner-email-send-log.json",
  "/usr/local/bin/npm",
  "/usr/local/bin/npx",
  "/usr/local/bin/yarn",
  "/usr/local/bin/yarnpkg",
];

function assertPath(path, expected) {
  let exists = true;
  try {
    statSync(path);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      exists = false;
    } else {
      throw error;
    }
  }

  if (exists !== expected) {
    throw new Error(`${path} must ${expected ? "exist" : "be absent"}`);
  }
}

function assertNoEnvFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;

    const path = join(directory, entry.name);
    if (basename(path).startsWith(".env")) {
      throw new Error(`private environment file present in image: ${path}`);
    }
    if (entry.isDirectory()) assertNoEnvFiles(path);
  }
}

if (process.version !== "v24.18.0") {
  throw new Error(`unexpected runtime ${process.version}`);
}
if (typeof process.getuid !== "function" || process.getuid() !== 1001) {
  throw new Error(`runtime must use uid 1001, got ${process.getuid?.()}`);
}

const releaseValues = [
  process.env.GIT_SHA,
  process.env.NEXT_DEPLOYMENT_ID,
  process.env.DEPLOYMENT_VERSION,
  process.env.SENTRY_RELEASE,
];
if (
  releaseValues.some((value) => !value || !/^[0-9a-f]{40}$/.test(value)) ||
  new Set(releaseValues).size !== 1
) {
  throw new Error("release identity environment variables must be the same full SHA");
}

for (const path of requiredPaths) assertPath(path, true);
for (const path of forbiddenPaths) assertPath(path, false);
assertNoEnvFiles("/app");

for (const path of [
  requiredPaths[0],
  requiredPaths[2],
  requiredPaths[3],
  requiredPaths[4],
  prismaEngine,
]) {
  if (statSync(path).uid !== 0) throw new Error(`${path} must remain root-owned`);
  try {
    accessSync(path, constants.W_OK);
    throw new Error(`${path} must not be writable by the runtime uid`);
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "EACCES")) {
      throw error;
    }
  }
}

const engineVersion = spawnSync(prismaEngine, ["--version"], {
  encoding: "utf8",
  timeout: 10_000,
});
if (engineVersion.status !== 0) {
  throw new Error(
    `Prisma OpenSSL 3 engine is not executable: ${engineVersion.stderr || engineVersion.error}`,
  );
}

const prismaVersion = spawnSync(
  process.execPath,
  ["/app/node_modules/prisma/build/index.js", "--version"],
  { encoding: "utf8", timeout: 15_000 },
);
if (prismaVersion.status !== 0 || !prismaVersion.stdout.includes("7.8.0")) {
  throw new Error(
    `Prisma CLI runtime validation failed: ${prismaVersion.stderr || prismaVersion.error}`,
  );
}

const cacheProbe = "/app/.next/cache/.runtime-write-probe";
writeFileSync(cacheProbe, "ok", { flag: "wx" });
unlinkSync(cacheProbe);

try {
  const packageJson = JSON.parse(readFileSync("/app/package.json", "utf8"));
  if (packageJson.scripts?.["partners:email"]) {
    throw new Error("forbidden partners:email command present in runtime package.json");
  }
} catch (error) {
  if (!(error && typeof error === "object" && error.code === "ENOENT")) {
    throw error;
  }
}

console.log("runtime image contents verified");
