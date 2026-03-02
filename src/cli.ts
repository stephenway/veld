import resolve from "@rollup/plugin-node-resolve";
import { rollup } from "rollup";
import svelte from "rollup-plugin-svelte";
import { getSvelteEntry } from "./get-svelte-entry";
import { generateBundle, type PluginSveldOptions, type SveldWarning, writeOutput } from "./plugin";

/**
 * Command-line interface for sveld.
 *
 * Parses command-line arguments, runs Rollup to process the entry point,
 * generates component documentation, and writes output files.
 *
 * @param process - Node.js process object containing command-line arguments
 *
 * @example
 * ```ts
 * // Called from CLI: sveld --types --json --glob
 * // Parses: { types: true, json: true, glob: true }
 * ```
 */
export async function cli(process: NodeJS.Process) {
  const options: PluginSveldOptions = process.argv
    .slice(2)
    .map((arg) => {
      const [flag, value] = arg.split("=");
      const key = flag.slice(2);
      return { [key]: value === undefined ? true : value };
    })
    .reduce(
      (a, c) => {
        for (const key in c) {
          a[key] = c[key];
        }
        return a;
      },
      {} as Record<string, string | boolean>,
    );

  const input = getSvelteEntry(options?.entry as string | undefined) || (options?.entry as string) || "src/index.js";
  const warnings: SveldWarning[] = [];

  try {
    const rollup_bundle = await rollup({
      input,
      plugins: [svelte(), resolve()],
    });
    await rollup_bundle.generate({});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const file = err && typeof err === "object" && "id" in err ? String((err as { id?: string }).id) : undefined;
    warnings.push({
      code: "SVELTE5_COMPILE_FAILED",
      message: `Rollup/Svelte compile failed; using fallback extraction. ${message}`,
      file: file ?? input,
    });
  }

  const result = await generateBundle(input, options?.glob === true);

  await writeOutput(result, { ...options, debug: options?.debug === true, warnings }, input);
}
