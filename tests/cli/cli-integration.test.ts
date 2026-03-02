/**
 * CLI integration tests.
 *
 * Runs the actual sveld CLI against test workdirs and compares output to goldens.
 * Uses deterministic paths and sorted output for stable snapshots.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = join(import.meta.dir, "../..");
const CLI_PATH = join(PROJECT_ROOT, "cli.js");
const LIB_PATH = join(PROJECT_ROOT, "lib");

function copyWorkdir(srcDir: string, destDir: string) {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyWorkdir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function runCli(workdir: string, args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd: workdir,
    env: { ...process.env, NODE_PATH: LIB_PATH },
    encoding: "utf-8",
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? -1,
  };
}

function normalizePaths(content: string, workdir: string): string {
  return content.replace(new RegExp(workdir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "<workdir>");
}

describe("CLI integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "veld-cli-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("svelte5-runes: JSON output matches golden", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-svelte5");
    copyWorkdir(workdirSrc, tempDir);

    const result = runCli(tempDir, ["--json", "--types", "--markdown", "--glob", "--entry=./src/index.js"]);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Error");

    const jsonPath = join(tempDir, "COMPONENT_API.json");
    const json = readFileSync(jsonPath, "utf-8");
    const normalized = normalizePaths(json, tempDir);

    expect(normalized).toMatchSnapshot();
  });

  test("svelte5-runes: .d.ts output matches golden", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-svelte5");
    copyWorkdir(workdirSrc, tempDir);

    runCli(tempDir, ["--json", "--types", "--markdown", "--glob", "--entry=./src/index.js"]);

    const typesDir = join(tempDir, "types");
    const indexDts = readFileSync(join(typesDir, "index.d.ts"), "utf-8");
    const normalized = normalizePaths(indexDts, tempDir);

    expect(normalized).toMatchSnapshot();
  });

  test("legacy: JSON output matches golden", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-legacy");
    copyWorkdir(workdirSrc, tempDir);

    const result = runCli(tempDir, ["--json", "--types", "--markdown", "--glob", "--entry=./src/index.js"]);

    expect(result.status).toBe(0);

    const jsonPath = join(tempDir, "COMPONENT_API.json");
    const json = readFileSync(jsonPath, "utf-8");
    const normalized = normalizePaths(json, tempDir);

    expect(normalized).toMatchSnapshot();
  });

  test("JSON omits extractionMode by default", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-svelte5");
    copyWorkdir(workdirSrc, tempDir);

    runCli(tempDir, ["--json", "--glob", "--entry=./src/index.js"]);

    const json = JSON.parse(readFileSync(join(tempDir, "COMPONENT_API.json"), "utf-8"));
    for (const c of json.components) {
      expect(c).not.toHaveProperty("extractionMode");
    }
  });

  test("JSON includes extractionMode with --debug", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-svelte5");
    copyWorkdir(workdirSrc, tempDir);

    runCli(tempDir, ["--json", "--glob", "--entry=./src/index.js", "--debug"]);

    const json = JSON.parse(readFileSync(join(tempDir, "COMPONENT_API.json"), "utf-8"));
    expect(json.components.length).toBeGreaterThan(0);
    for (const c of json.components) {
      expect(c).toHaveProperty("extractionMode");
      expect(["legacy", "svelte5-fallback"]).toContain(c.extractionMode);
    }
  });

  test("file ordering is stable across runs", async () => {
    const workdirSrc = join(PROJECT_ROOT, "tests/cli/workdir-svelte5");
    copyWorkdir(workdirSrc, tempDir);

    runCli(tempDir, ["--json", "--types", "--glob", "--entry=./src/index.js"]);
    const json1 = readFileSync(join(tempDir, "COMPONENT_API.json"), "utf-8");

    rmSync(join(tempDir, "COMPONENT_API.json"), { force: true });
    rmSync(join(tempDir, "types"), { recursive: true, force: true });

    runCli(tempDir, ["--json", "--types", "--glob", "--entry=./src/index.js"]);
    const json2 = readFileSync(join(tempDir, "COMPONENT_API.json"), "utf-8");

    expect(json1).toBe(json2);
  });
});
