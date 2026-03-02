# Release Readiness Report

**Date:** 2025-03-02  
**Package:** veld@0.26.2  
**Scope:** Read-only interrogation — can we safely release without embarrassment?

---

## 0) Ground truth: what is being released?

### package.json summary

| Field | Value |
|-------|-------|
| **name** | `veld` |
| **version** | `0.26.2` |
| **private** | Not set (publishable) |
| **main** | `./lib/index.js` |
| **types** | `./lib/index.d.ts` |
| **bin** | `veld` → `cli.js` |
| **exports** | Not present (uses default main/types/bin) |
| **files** | `["lib", "cli.js"]` |
| **engines.node** | `>=22 <26` |
| **.npmignore** | Not present |

### Scripts

- **prepare**: `npm run build` — runs before `npm pack` and `npm publish`
- **build**: `tsc` — produces `lib/`
- **test**: `bun test`
- **test:fixtures-types**: `tsc --project tsconfig.fixtures.json`
- **test:e2e**: `bun tests/test-e2e.ts`
- **update-goldens**: Snapshot update script

### Release artifact directory

- **Output:** `lib/` (TypeScript → CommonJS via `tsc`)
- **Git:** `lib/` is in `.gitignore` — artifacts are **not** checked in
- **Publish flow:** `prepare` runs `build` before pack/publish, so `lib/` is built at publish time

---

## 1) Build artifact integrity (src vs lib consistency)

### Build pipeline

- **Tool:** `tsc` (TypeScript compiler)
- **Config:** `tsconfig.json` — `outDir: "lib"`, `include: ["src/**/*"]`
- **Output:** CommonJS `.js` + `.d.ts` for each source file

### src vs lib mapping

| src | lib | Status |
|-----|-----|--------|
| `index.ts` | `lib/index.js` | ✓ |
| `cli.ts` | `lib/cli.js` | ✓ |
| `plugin.ts` | `lib/plugin.js` | ✓ |
| `veld.ts` | `lib/veld.js` | ✓ |
| `ComponentParser.ts` | `lib/ComponentParser.js` | ✓ |
| `extractors/svelte5Props.ts` | `lib/extractors/svelte5Props.js` | ✓ |
| `writer/*.ts` | `lib/writer/*.js` | ✓ |
| All other src files | Corresponding lib files | ✓ |

### CLI path verification

- `cli.js` → `require("./lib").cli` → `lib/index.js` exports `cli` from `./cli`
- `cli()` is async and is properly awaited in `cli.js`

### Prepublish / prepare

- **prepare** runs `npm run build` before `npm pack` and `npm publish`
- Publish workflow (`.github/workflows/publish-to-npm.yml`) runs `bun run build` before `npm publish`
- **Conclusion:** Build artifacts are produced at publish time; no stale `lib` risk

### npm pack dry-run

```
Tarball contents: 48 files
- LICENSE, README.md, package.json
- cli.js
- lib/*.js, lib/*.d.ts (all sources represented)
- lib/extractors/svelte5Props.js, svelte5Props.d.ts ✓
```

**Verdict:** Build integrity is sound. All critical sources (including Svelte 5 extractor, CLI, plugin) have corresponding built outputs. Publish cannot ship stale `lib`.

---

## 2) CLI correctness and async safety

### cli.js

```javascript
(async () => {
  try {
    await require("./lib").cli(process);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
```

- **cli()** is async — ✓ awaited
- **Error handling:** try/catch with `process.exit(1)` on failure
- **Unhandled rejection:** Wrapped in async IIFE; rejections become uncaught and would exit non‑zero (Node 22/24 default behavior)

### cli.ts flow

- `generateBundle()` and `writeOutput()` are awaited
- `writeOutput()` uses `Promise.all(writePromises)` — all writes complete before return
- No early exit before work completes

### Output writing

- `Writer.write()` uses `await writeFile()` and `await format()`
- Directories created with `mkdir(..., { recursive: true })`
- `writeJson` uses `Promise.all()` for per-component files — deterministic completion order for the overall flow

**Verdict:** CLI does not exit before completing work. Failures surface via exit code 1. Outputs are fully written before exit.

---

## 3) Schema durability and compatibility

### JSON output schema

**Top-level keys (default):**

- `total`: number
- `components`: `ComponentDocApi[]`

**Debug-only (with `--debug`):**

- `schemaVersion`: number (currently `1`)
- `extractionMode`: `"legacy" | "svelte5-fallback"` (per component)
- `warnings`: `VeldWarning[]`

### Gating behavior

- **Default:** `extractionMode` is stripped in `writer-json.ts` (lines 57–59) when `!debug`
- **With `--debug`:** `schemaVersion`, `extractionMode`, and `warnings` are included
- Tests confirm: `JSON omits extractionMode by default`, `JSON includes extractionMode and schemaVersion with --debug`

### Schema version

- `SCHEMA_VERSION = 1` in `plugin.ts`
- Emitted only when `debug` is true

### Compatibility

- Unreleased changes (CHANGELOG) are additive: `extractionMode`, `warnings`, Svelte 5 props
- No breaking changes to existing fields

**Recommended schema contract (for docs):**

> Default JSON output: `{ total, components }`. With `--debug`, output may include `schemaVersion`, per-component `extractionMode`, and top-level `warnings`. Consumers should treat `extractionMode` and `warnings` as optional and only rely on them when `schemaVersion` is present.

---

## 4) Determinism across environments (release risk)

### Sorts

| Location | Usage | Risk |
|----------|-------|------|
| `writer-json.ts:63` | `localeCompare(b.moduleName)` | No locale — can vary by system locale |
| `writer/markdown-render-utils.ts:35` | `Array.from(keys).sort()` | String keys — stable |
| `writer/markdown-render-utils.ts:89` | `sort((a) => ...)` | Comparator ignores `b` — groups by reactive/constant; relative order within groups may vary |
| `ComponentParser.ts:3228` | `?.elements.sort()` | String elements — stable |
| `ComponentParser.ts:3265` | `sort((a,b) => aName < bName ? -1 : ...)` | Explicit comparator — stable |
| `plugin.ts:134` | `globSync(...).sort()` | Default string sort — stable |

### Formatting

- **Prettier:** `^3.8.0` — not pinned; minor updates could change formatting
- Writer uses `parser: "typescript"` / `parser: "json"`, `printWidth: 80` — consistent within a Prettier version

### Paths

- `normalizeSeparators()` in `path.ts` — converts `\` to `/` on Windows
- `path.normalize()` and `path.join()` used for `filePath` in JSON
- `writer-json.ts:56` — `path.join(inputDir, path.normalize(component.filePath))` can produce absolute paths when `inputDir` is absolute
- CLI integration tests use `normalizePaths()` to replace workdir with `<workdir>` for stable snapshots

### Environment sensitivity

- **Locale:** `localeCompare` without locale can differ across systems
- **OS:** Path separators normalized; temp dirs use `os.tmpdir()`
- **Node:** Engines `>=22 <26`; behavior on 18/20 is unsupported

**Verdict:** Output is generally stable. Main risks: `localeCompare` without locale and Prettier version drift. CI snapshots use path normalization; `localeCompare` on ASCII module names is usually stable.

---

## 5) Test + CI signal quality

### Test runner and coverage

- **Runner:** Bun test
- **Unit tests:** ComponentParser, create-exports, parse-exports, path, Writer, svelte5Props, plugin, etc.
- **Fixture tests:** 86+ fixtures (JSON + TypeScript snapshots), including `svelte5-runes/*`
- **CLI integration:** Real CLI against `workdir-svelte5` and `workdir-legacy`; JSON, .d.ts, markdown; `--debug` gating
- **Svelte 5 regression:** `svelte5-runes-integration.test.ts` — runes fixtures and legacy unchanged

### CI workflow (`.github/workflows/ci.yml`)

- **Node matrix:** 18, 20, 22, 24 (via include)
- **OS:** ubuntu-latest, windows-latest, macos-15
- **Steps:** Lint (biome), build, test, typecheck fixtures
- **No:** `npm pack` validation step

### CI vs engines mismatch

- **engines.node:** `>=22 <26`
- **README / CONTRIBUTING:** Node 18 unsupported; Node 22 and 24 supported
- **CI:** Runs on Node 18 and 20 — tests unsupported versions

**Verdict:** Test coverage is strong. Svelte 5 runes, CLI, and `--debug` are exercised. CI runs on Node 18/20 despite engines; this is a configuration mismatch, not a test gap.

---

## 6) Documentation and user-facing contract clarity

### README.md

- Install and usage (Vite, Node.js, CLI) are correct
- Svelte 5 limitations: props-only fallback, no cross-file types, `--debug` for `extractionMode`
- Node support: "Node 18 is unsupported (EOL). Minimum supported Node is 22. We support the current and previous LTS (22 and 24)."
- Plugin options document `debug`; `--debug` is mentioned in the Svelte 5 section
- CLI flags (`--json`, `--markdown`) shown; `--debug` not listed in a dedicated CLI flags section

### CONTRIBUTING.md

- Upstream: `IBM/sveld.git` — package.json uses `carbon-design-system/sveld` (inconsistent)
- Node 22+ and Bun documented

### CHANGELOG.md

- Unreleased section documents Svelte 5 runes, `--debug`, warnings, CLI integration tests

**Verdict:** Docs are generally clear. Minor gaps: `--debug` not in CLI flags list; CONTRIBUTING upstream URL mismatch.

---

## 7) Final verdict

### A) Verdict

**Ship with warnings**

### B) Blockers

None. No hard blockers identified.

### C) Non-blocking follow-ups (ranked)

1. **CI / engines alignment**  
   `.github/workflows/ci.yml` runs Node 18 and 20; `package.json` engines require `>=22 <26`. Align CI matrix with supported versions (e.g. 22, 24) to avoid testing unsupported environments.

2. **Console.log typo in writer-json**  
   `src/writer/writer-json.ts:91` — `console.log(\`created ${outFile}"\n\`)` has an extra `"` before `\n`, producing output like `created /path/file.api.json"\n`. Fix: remove the stray `"`.

3. **localeCompare locale**  
   `src/writer/writer-json.ts:63` — `a.moduleName.localeCompare(b.moduleName)` uses default locale. Use `localeCompare(b.moduleName, "en")` for stable ordering across environments.

4. **Prettier version**  
   `prettier: "^3.8.0"` — consider pinning (e.g. `3.8.0`) to avoid formatting changes from minor updates.

5. **CONTRIBUTING upstream URL**  
   CONTRIBUTING references `IBM/sveld.git`; package.json uses `carbon-design-system/sveld`. Update CONTRIBUTING to match the canonical repo.

6. **CLI flags documentation**  
   Add `--debug` to the CLI usage section in README for discoverability.

7. **CI pack check**  
   Add an `npm pack` (or `npm pack --dry-run`) step to CI to validate the published artifact before release.
