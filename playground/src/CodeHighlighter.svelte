<script lang="ts" context="module">
  import json from "svelte-highlight/languages/json";
  import markdown from "svelte-highlight/languages/markdown";
  import typescript from "svelte-highlight/languages/typescript";

  const LANG = {
    json,
    typescript,
    markdown,
  } as const;
</script>

<script lang="ts">
  export let code = "";
  export let language: keyof typeof LANG = "typescript";
  export let noWrap = false;

  import Highlight from "svelte-highlight";
  import "svelte-highlight/styles/zenburn.css";

  async function _copyToClipboard() {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }
</script>

<div class="code-highlighter" class:noWrap>
  <div>
    <button
      type="button"
      class="copy-button"
      on:click={copyToClipboard}
      title="Copy to clipboard"
    >
      Copy
    </button>
  </div>
  <Highlight language={LANG[language]} {code} />
</div>

<style>
  .code-highlighter {
    position: relative;
    display: flex;
    flex: 1;
    width: 100%;
  }

  .code-highlighter div {
    position: absolute;
    top: 0.5rem;
    right: 1.5rem;
    z-index: 1;
  }

  .copy-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--brand-charcoal);
    border: 1px solid var(--brand-ash);
    border-radius: 4px;
    color: var(--brand-bone);
    cursor: pointer;
  }

  .copy-button:hover {
    background: var(--brand-ash);
    color: var(--brand-warm-white);
  }

  :global(code.hljs) {
    background: var(--brand-charcoal);
    font-family: ui-monospace, monospace;
    font-size: 0.875rem;
    cursor: text;
  }

  :global(.code-highlighter:not(.noWrap) code.hljs) {
    white-space: pre-wrap;
  }

  :global(pre code.hljs) {
    padding: 1rem;
  }
</style>
