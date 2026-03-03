<script lang="ts">
  import { onMount, type SvelteComponent, tick } from "svelte";
  import ComponentParser from "../../src/ComponentParser";
  import CodeEditor from "./CodeEditor.svelte";
  import data from "./data";
  import Header from "./Header.svelte";
  import TabContentOverlay from "./TabContentOverlay.svelte";

  const parser = new ComponentParser();

  type TabProps = {
    parsed_component?: Record<string, unknown>;
    moduleName?: string;
  };

  let selectedId = data[0].moduleName;
  let tabTypeScript: typeof SvelteComponent<TabProps>;
  let tabJson: typeof SvelteComponent<TabProps>;
  let tabMarkdown: typeof SvelteComponent<TabProps>;

  onMount(() => {
    import("./TabTypeScript.svelte").then((importee) => {
      tabTypeScript = importee.default;
    });
    import("./TabJson.svelte").then((importee) => {
      tabJson = importee.default;
    });
    import("./TabMarkdown.svelte").then((importee) => {
      tabMarkdown = importee.default;
    });
  });

  $: selected = data.find((datum) => datum.moduleName === selectedId);
  $: value = selected?.code;
  $: moduleName = selected?.moduleName ?? "Component";

  let parsed_component = {};
  let parse_error: string | null = null;
  let codemirror: CodeMirror.Editor | null = null;

  $: {
    try {
      parse_error = null;
      if (value) {
        parsed_component = parser.parseSvelteComponent(value, {
          moduleName,
          filePath: "VIRTUAL",
        });
      }
    } catch (error) {
      parse_error = error as string;
    }
  }

  let activeTab: "ts" | "json" | "md" = "ts";

  function _handleSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    selectedId = target.value;
    tick().then(() => {
      if (selected?.code) {
        codemirror?.setValue(selected.code);
      }
    });
  }
</script>

<Header>
  <div class="playground-layout">
    <div class="playground-editor">
      <label for="component-select" class="playground-label">Svelte code</label>
      <select
        id="component-select"
        class="playground-select"
        value={selectedId}
        on:change={handleSelect}
      >
        {#each data as datum}
          <option value={datum.moduleName}>{datum.name}</option>
        {/each}
      </select>
      <CodeEditor
        bind:code={value}
        bind:codemirror
        on:change={(e) => {
          value = e.detail;
        }}
      />
    </div>
    <div class="playground-output">
      <label for="output-tabs" class="playground-label">Veld output</label>
      <div class="playground-tabs" role="tablist" id="output-tabs">
        <button
          type="button"
          class="playground-tab"
          class:active={activeTab === "ts"}
          role="tab"
          aria-selected={activeTab === "ts"}
          on:click={() => (activeTab = "ts")}
        >
          TypeScript
        </button>
        <button
          type="button"
          class="playground-tab"
          class:active={activeTab === "json"}
          role="tab"
          aria-selected={activeTab === "json"}
          on:click={() => (activeTab = "json")}
        >
          JSON
        </button>
        <button
          type="button"
          class="playground-tab"
          class:active={activeTab === "md"}
          role="tab"
          aria-selected={activeTab === "md"}
          on:click={() => (activeTab = "md")}
        >
          Markdown
        </button>
      </div>
      <div class="playground-tabpanels">
        {#if parse_error}
          <TabContentOverlay title="Parse error">
            {parse_error}
          </TabContentOverlay>
        {/if}
        <div
          class="playground-tabpanel"
          role="tabpanel"
          aria-hidden={activeTab !== "ts"}
          hidden={activeTab !== "ts"}
        >
          {#if tabTypeScript}
            <svelte:component this={tabTypeScript} {parsed_component} {moduleName} />
          {:else}
            <div class="playground-loading">Loading…</div>
          {/if}
        </div>
        <div
          class="playground-tabpanel"
          role="tabpanel"
          aria-hidden={activeTab !== "json"}
          hidden={activeTab !== "json"}
        >
          {#if tabJson}
            <svelte:component this={tabJson} {parsed_component} {moduleName} />
          {:else}
            <div class="playground-loading">Loading…</div>
          {/if}
        </div>
        <div
          class="playground-tabpanel"
          role="tabpanel"
          aria-hidden={activeTab !== "md"}
          hidden={activeTab !== "md"}
        >
          {#if tabMarkdown}
            <svelte:component this={tabMarkdown} {parsed_component} {moduleName} />
          {:else}
            <div class="playground-loading">Loading…</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</Header>


<style>
  .playground-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    min-height: calc(100vh - var(--header-height, 3.5rem) - 2rem);
  }

  @media (max-width: 1056px) {
    .playground-layout {
      grid-template-columns: 1fr;
    }
  }

  .playground-editor,
  .playground-output {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .playground-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--brand-bone);
    letter-spacing: 0.025em;
  }

  .playground-select {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background: var(--brand-charcoal);
    border: 1px solid var(--brand-ash);
    border-radius: 4px;
    color: var(--brand-warm-white);
    cursor: pointer;
  }

  .playground-select:focus {
    outline: 2px solid var(--brand-accent);
    outline-offset: 2px;
  }

  .playground-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--brand-ash);
  }

  .playground-tab {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--brand-bone);
    cursor: pointer;
  }

  .playground-tab:hover {
    color: var(--brand-warm-white);
  }

  .playground-tab.active {
    color: var(--brand-accent);
    border-bottom-color: var(--brand-accent);
  }

  .playground-tabpanels {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .playground-tabpanel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-height: calc(100vh - 18rem);
  }

  .playground-tabpanel[hidden] {
    display: none;
  }

  .playground-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--brand-bone);
  }

  :global(pre) {
    display: flex;
    flex: 1;
    overflow: auto;
  }

  :global(pre code) {
    flex: 1;
  }

  :global(textarea) {
    height: calc(100vh - 18rem);
  }
</style>
