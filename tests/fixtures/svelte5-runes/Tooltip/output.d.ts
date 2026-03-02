import { SvelteComponentTyped } from "svelte";
import type { Snippet } from "svelte";

export type Svelte5RunesTooltipProps = {
  /**
   * @default undefined
   */
  text: string;

  /**
   * @default undefined
   */
  children: Snippet;
};

export default class Svelte5RunesTooltip extends SvelteComponentTyped<
  Svelte5RunesTooltipProps,
  Record<string, any>,
  Record<string, never>
> {}
