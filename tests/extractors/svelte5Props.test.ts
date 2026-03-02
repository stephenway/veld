import {
  extractInstanceScript,
  extractSvelte5Props,
  extractSvelte5PropsFromSource,
  hasPropsRune,
} from "../../src/extractors/svelte5Props";

describe("extractInstanceScript", () => {
  test("extracts single script block", () => {
    const source = `<script>
  let x = 1;
</script>`;
    expect(extractInstanceScript(source)).toBe("\n  let x = 1;\n");
  });

  test("returns last non-module script when multiple", () => {
    const source = `<script context="module">
  export const x = 1;
</script>
<script>
  let { foo } = $props();
</script>`;
    expect(extractInstanceScript(source)).toContain("$props()");
  });

  test("returns null when no script", () => {
    expect(extractInstanceScript("<div>hello</div>")).toBeNull();
  });
});

describe("hasPropsRune", () => {
  test("returns true when $props() present", () => {
    expect(hasPropsRune("let { x } = $props();")).toBe(true);
    expect(hasPropsRune("  $props()  ")).toBe(true);
  });

  test("returns false when $props() absent", () => {
    expect(hasPropsRune("export let x = 1;")).toBe(false);
    expect(hasPropsRune("$state(0)")).toBe(false);
  });
});

describe("extractSvelte5Props", () => {
  test("extracts props from inline type literal", () => {
    const script = "let { foo }: { foo: string } = $props();";
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(1);
    expect(props[0]).toMatchObject({
      name: "foo",
      type: "string",
      isRequired: true,
    });
  });

  test("extracts props with defaults", () => {
    const script = `let { size = "md", count = 0 }: Props = $props();`;
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(2);
    expect(props[0]).toMatchObject({ name: "size", value: '"md"', isRequired: false });
    expect(props[1]).toMatchObject({ name: "count", value: "0", isRequired: false });
  });

  test("extracts props from interface", () => {
    const script = `
interface Props {
  text: string;
  children: Snippet;
}
let { text, children }: Props = $props();
`;
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(2);
    expect(props[0]).toMatchObject({ name: "text", type: "string" });
    expect(props[1]).toMatchObject({ name: "children", type: "Snippet" });
  });

  test("handles destructuring rename - doc name is original prop name", () => {
    const script = `let { longPropName: short = "x" }: { longPropName?: string } = $props();`;
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(1);
    expect(props[0].name).toBe("longPropName");
    expect(props[0].value).toBe('"x"');
  });

  test("ignores rest element", () => {
    const script = "let { a, ...rest }: { a: number } = $props();";
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(1);
    expect(props[0].name).toBe("a");
    expect(props.map((p) => p.name)).not.toContain("rest");
  });

  test("extracts computed default expression", () => {
    const script = "let { id = crypto.randomUUID() }: { id?: string } = $props();";
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(1);
    expect(props[0]).toMatchObject({
      name: "id",
      value: "crypto.randomUUID()",
      type: "string",
      isRequired: false,
    });
  });

  test("returns empty when no $props()", () => {
    const script = "export let x = 1;";
    const props = extractSvelte5Props(script);
    expect(props).toHaveLength(0);
  });
});

describe("extractSvelte5PropsFromSource", () => {
  test("extracts from full .svelte source", () => {
    const source = `<script lang="ts">
  let { foo = 123 }: { foo?: number } = $props();
</script>
<div>{foo}</div>`;
    const props = extractSvelte5PropsFromSource(source);
    expect(props).not.toBeNull();
    expect(props).toHaveLength(1);
    expect(props?.[0]).toMatchObject({ name: "foo", value: "123", type: "number" });
  });

  test("returns null when no $props() in source", () => {
    const source = "<script>export let x = 1;</script><div>{x}</div>";
    expect(extractSvelte5PropsFromSource(source)).toBeNull();
  });
});
