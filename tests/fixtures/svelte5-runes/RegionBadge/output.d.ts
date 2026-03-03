import { SvelteComponentTyped } from "svelte";

export type Svelte5RunesRegionBadgeProps = {
  /**
   * @default "bluray"
   */
  format?: "dvd" | "bluray" | "4k";

  /**
   * @default null
   */
  regionCode?: string | null;
};

export default class Svelte5RunesRegionBadge extends SvelteComponentTyped<
  Svelte5RunesRegionBadgeProps,
  Record<string, any>,
  Record<string, never>
> {}
