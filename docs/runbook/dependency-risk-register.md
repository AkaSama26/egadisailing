# Dependency risk register

Last review: 2026-08-19

Owner: Egadisailing engineering / operations
Next mandatory review: 2026-09-19 or before any production release, whichever
comes first.

## Release gate

CI fails on every HIGH or CRITICAL advisory in the complete dependency tree,
runtime-only tree and final container image unless an exact package-scoped,
time-bounded non-exposure exception is recorded below. Trivy exceptions must
include an expiry date and become release-blocking automatically when they
expire. Lower-severity findings are not silently waived: they remain listed
below with scope and compensating controls.

Measured with Node 24.18.0, npm 11.16.0 and the committed lockfile:

- complete npm tree: 0 critical, 0 high, 1 moderate, 2 low;
- runtime npm tree: 0 critical, 0 high, 0 moderate, 1 low;
- pinned distroless runtime base: 0 critical, 1 high suppressed by the
  time-bounded non-exposure exception below at the review date.

## Accepted findings

| Advisory | Severity / scope | Exposure and decision | Exit condition |
|---|---|---|---|
| `CVE-2026-14456` (`libssl3t64` 3.5.6-1~deb13u2) | High in Trivy; Debian classifies it as minor/postponed; runtime OS package | The flaw is confined to OpenSSL QUIC server listeners accepting QUIC Initial packets. Egadisailing runs the Node.js HTTP server behind the central nginx proxy and does not instantiate or expose an OpenSSL QUIC listener. A package-scoped Trivy exception is accepted through 2026-09-19; all other HIGH/CRITICAL findings remain blocking. | Remove the exception immediately when the pinned distroless Debian 13 image contains a fixed package, or by 2026-09-19 at the latest. Reassess sooner if Egadisailing introduces HTTP/3/QUIC termination inside the app container. |
| `GHSA-h67p-54hq-rp68` (`js-yaml` 4.1.1) | Moderate, development only through ESLint | CI parses repository-owned lint configuration; it does not accept untrusted YAML. No production package path. | Upgrade when ESLint resolves a patched compatible release; do not force an override without the full lint/test gate. |
| `GHSA-g7r4-m6w7-qqqr` (`esbuild` 0.27.7) | Low, development only | The issue requires the esbuild development server on Windows. CI/production are Linux and this project never exposes that server. | Move to the patched esbuild line when both Vite and `tsx` ranges permit it. |
| `GHSA-4x5r-pxfx-6jf8` (`@babel/core` 7.29.0) | Low, runtime tree through Sentry tooling | Exploitation requires local control of a crafted source map input. Production does not compile user-provided sources and application files are immutable/root-owned. | Upgrade through the Sentry/Next dependency chain as soon as a compatible patched version is resolved by the lockfile. |

`npm audit fix --force`, `legacy-peer-deps` and unreviewed transitive overrides
are prohibited. A lower-severity finding becoming remotely exploitable in the
application context is grounds to block the release even if its numeric
severity remains below HIGH.

## Scanner coverage caveat

Trivy identifies operating-system packages in the pinned distroless image and
JavaScript packages copied into the final filesystem. It does not currently
identify the distroless Node executable as a language-specific package.
Therefore the image scan alone is not evidence that the Node runtime has no
advisory. The owner must review official Node security releases monthly and
whenever CI proposes a base-image update; the smoke test also asserts the exact
runtime version.

Node 24.13.0 was deliberately not retained: later Node 24 security releases
fixed HIGH-severity issues. The project now pins Node 24.18.0 and npm 11.16.0
consistently in local version files, `package.json`, CI and Docker.

## Install-script policy

npm runs in strict allow-script mode. Only the pinned Prisma CLI/engine scripts
are approved because they enforce the Node version and obtain the checksum-
verified engine target required by migrations. Optional native packages use
their lockfile-pinned prebuilt artifacts and are explicitly denied lifecycle
scripts. Any new unreviewed install script makes `npm ci` fail.
