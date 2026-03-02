import { SvelteComponentTyped } from "svelte";

export type Svelte5RunesEdgeCasesProps = {
  /**
   * @default "x"
   */
  longPropName?: string;

  /**
   * @default undefined
   */
  a: number;

  /**
   * @default crypto.randomUUID()
   */
  id?: string;
};

export default class Svelte5RunesEdgeCases extends SvelteComponentTyped<
  Svelte5RunesEdgeCasesProps,
  Record<string, any>,
  Record<string, never>
> {}
