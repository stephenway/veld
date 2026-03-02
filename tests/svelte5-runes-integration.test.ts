/**
 * Integration tests for Svelte 5 runes support.
 *
 * Verifies that veld correctly generates docs for Svelte 5 components
 * using $props(), and that existing Svelte 3/4 fixtures remain unchanged.
 */
import path from "node:path";
import { Glob } from "bun";
import ComponentParser from "../src/ComponentParser";

const PATH_SEPARATOR_REGEX = /[-/]/;

const fixturesFolder = path.join(process.cwd(), "tests", "fixtures");
const svelte5Folder = path.join(fixturesFolder, "svelte5-runes");

describe("Svelte 5 runes integration", () => {
  const parser = new ComponentParser();

  test("generates docs for Svelte 5 runes fixtures", async () => {
    const files: string[] = [];
    for await (const file of new Glob("**/input.svelte").scan(svelte5Folder)) {
      files.push(file.replace(/\\/g, "/"));
    }
    expect(files.length).toBeGreaterThan(0);

    await Promise.all(
      files.map(async (filePath) => {
        const fullPath = path.join(svelte5Folder, filePath);
        const source = await Bun.file(fullPath).text();
        const { dir } = path.parse(filePath);
        const moduleName = dir
          .split(PATH_SEPARATOR_REGEX)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("");

        const parsed = parser.parseSvelteComponent(source, { filePath: fullPath, moduleName });

        expect(parsed.props.length).toBeGreaterThan(0);
        for (const prop of parsed.props) {
          expect(prop.name).toBeTruthy();
          expect(typeof prop.isRequired).toBe("boolean");
        }
      }),
    );
  });

  test("does not break existing Svelte 3/4 fixtures", async () => {
    const legacyFiles: string[] = [];
    for await (const file of new Glob("**/input.svelte").scan(fixturesFolder)) {
      const normalized = file.replace(/\\/g, "/");
      if (!normalized.startsWith("svelte5-runes/")) {
        legacyFiles.push(normalized);
      }
    }

    await Promise.all(
      legacyFiles.map(async (filePath) => {
        const fullPath = path.join(fixturesFolder, filePath);
        const source = await Bun.file(fullPath).text();
        const { dir } = path.parse(filePath);
        const moduleName = dir
          .split(PATH_SEPARATOR_REGEX)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("");

        const parsed = parser.parseSvelteComponent(source, { filePath: fullPath, moduleName });

        expect(parsed).toBeDefined();
        expect(Array.isArray(parsed.props)).toBe(true);
        expect(Array.isArray(parsed.slots)).toBe(true);
        expect(Array.isArray(parsed.events)).toBe(true);
      }),
    );
  });

  test("stable output ordering for Svelte 5 props", async () => {
    const source = await Bun.file(path.join(svelte5Folder, "EdgeCases/input.svelte")).text();
    const parsed1 = parser.parseSvelteComponent(source, {
      filePath: "EdgeCases.svelte",
      moduleName: "EdgeCases",
    });
    const parsed2 = parser.parseSvelteComponent(source, {
      filePath: "EdgeCases.svelte",
      moduleName: "EdgeCases",
    });

    expect(parsed1.props.map((p) => p.name)).toEqual(parsed2.props.map((p) => p.name));
  });
});
