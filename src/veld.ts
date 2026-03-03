import { getSvelteEntry } from "./get-svelte-entry";
import { generateBundle, type PluginVeldOptions, writeOutput } from "./plugin";

interface VeldOptions extends PluginVeldOptions {
  /**
   * Specify the input to the uncompiled Svelte source.
   * If no value is provided, `veld` will attempt to infer
   * the entry point from the `package.json#svelte` field.
   */
  input?: string;
}

/**
 * Main entry point for programmatic veld usage.
 *
 * Generates component documentation from Svelte source files and writes
 * output files based on the provided options. Can be used as a library
 * in addition to the CLI interface.
 *
 * @param opts - Options for generating documentation
 * @returns A promise that resolves when documentation generation is complete
 *
 * @example
 * ```ts
 * await veld({
 *   input: "./src",
 *   types: true,
 *   json: true,
 *   markdown: true,
 *   glob: true
 * });
 * ```
 */
export async function veld(opts?: VeldOptions) {
  const input = getSvelteEntry(opts?.input);
  if (input === null) return;
  const result = await generateBundle(input, opts?.glob === true);
  await writeOutput(result, opts || {}, input);
}
