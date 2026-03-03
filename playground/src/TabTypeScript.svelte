<script lang="ts">
  export let parsed_component: Record<string, unknown> = {};
  export let moduleName = "";

  import pluginEstree from "prettier/plugins/estree";
  import pluginTypeScript from "prettier/plugins/typescript";
  import { format } from "prettier/standalone";
  import { writeTsDefinition } from "../../src/writer/writer-ts-definitions-core";
  import CodeHighlighter from "./CodeHighlighter.svelte";
  import TabContentOverlay from "./TabContentOverlay.svelte";

  let prettier_error: unknown = null;

  const EMPTY_DOC = {
    props: [],
    moduleExports: [],
    slots: [],
    events: [],
    typedefs: [],
    generics: null,
    rest_props: undefined,
    filePath: "VIRTUAL",
    moduleName: "",
  };

  $: normalized = {
    ...EMPTY_DOC,
    ...parsed_component,
    props: (parsed_component.props as unknown[]) ?? [],
    moduleExports: (parsed_component.moduleExports as unknown[]) ?? [],
    slots: (parsed_component.slots as unknown[]) ?? [],
    events: (parsed_component.events as unknown[]) ?? [],
    typedefs: (parsed_component.typedefs as unknown[]) ?? [],
    moduleName,
    filePath: (parsed_component.filePath as string) ?? "VIRTUAL",
  };

  $: code = (() => {
    try {
      return writeTsDefinition(normalized);
    } catch (e) {
      prettier_error = e;
      return `// Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  })();
  $: {
    prettier_error = null;
    format(code, {
      parser: "typescript",
      plugins: [pluginTypeScript, pluginEstree],
    })
      .then((formatted) => {
        code = formatted;
      })
      .catch((error) => {
        prettier_error = error;
      });
  }
</script>

{#if prettier_error}
  <TabContentOverlay title="TypeScript formatting error" kind="warning">
    {prettier_error}
  </TabContentOverlay>
{/if}
<CodeHighlighter language="typescript" {code} />
