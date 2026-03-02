import { SvelteComponentTyped } from "svelte";

export type Svelte5RunesNoInterfaceProps = {
  /**
   * @default undefined
   */
  foo: string;
};

export default class Svelte5RunesNoInterface extends SvelteComponentTyped<
  Svelte5RunesNoInterfaceProps,
  Record<string, any>,
  Record<string, never>
> {}
