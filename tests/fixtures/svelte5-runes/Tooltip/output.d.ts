import { SvelteComponentTyped } from "svelte";
import type { Snippet } from "svelte";

export type Svelte5RunesTooltipProps = {
  /**
   * The tooltip text to display
   * @default undefined
   */
  text: string;

  /**
   * Child content that triggers the tooltip
   * @default undefined
   */
  children: Snippet;
};

export default class Svelte5RunesTooltip extends SvelteComponentTyped<
  Svelte5RunesTooltipProps,
  Record<string, any>,
  Record<string, never>
> {}
