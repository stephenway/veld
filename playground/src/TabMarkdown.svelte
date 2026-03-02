<script lang="ts">
  export let parsed_component: Record<string, unknown> = {};
  export let moduleName = "";

  import pluginMarkdown from "prettier/plugins/markdown";
  import { format } from "prettier/standalone";
  import { writeMarkdownCore as writeMarkdown } from "../../src/writer/writer-markdown-core";
  import CodeHighlighter from "./CodeHighlighter.svelte";

  let markdown = "";
  let code = "";

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

  $: {
    try {
      const components = new Map([[moduleName, normalized]]);
      markdown = writeMarkdown(components);
    } catch (error) {
      console.log(error);
      markdown = "";
    }
  }
  $: {
    format(markdown, {
      parser: "markdown",
      plugins: [pluginMarkdown],
    })
      .then((formatted) => {
        code = formatted;
      })
      .catch((error) => {
        console.log(error);
      });
  }
</script>

<CodeHighlighter noWrap language="markdown" {code} />
