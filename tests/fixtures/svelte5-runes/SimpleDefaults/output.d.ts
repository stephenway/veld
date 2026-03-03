import { SvelteComponentTyped } from "svelte";

export type Svelte5RunesSimpleDefaultsProps = {
  /**
   * @default "md"
   */
  size?: "sm" | "md";

  /**
   * @default 0
   */
  count?: number;
};

export default class Svelte5RunesSimpleDefaults extends SvelteComponentTyped<
  Svelte5RunesSimpleDefaultsProps,
  Record<string, any>,
  Record<string, never>
> {}
