<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * Tooltip text shown on hover.
   */
  interface Props {
    /** The tooltip text to display */
    text: string;
    /** Child content that triggers the tooltip */
    children: Snippet;
  }

  let { text, children }: Props = $props();
  let show = $state(false);
  let label = $derived.by(() => (show ? text : ""));
</script>

<div onmouseenter={() => (show = true)} onmouseleave={() => (show = false)}>
  {@render children()}
  {#if show}
    <span class="tooltip">{label}</span>
  {/if}
</div>
