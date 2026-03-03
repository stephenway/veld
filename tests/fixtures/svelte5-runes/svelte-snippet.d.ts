/**
 * Snippet type for Svelte 5 runes fixtures.
 * Svelte 4 does not export Snippet; this declaration allows fixture type-checking
 * when generated output references Snippet.
 */
declare module "svelte" {
  export type Snippet<T extends unknown[] = []> = (...args: T) => void;
}
