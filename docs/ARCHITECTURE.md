# veld Architecture

## Overview

veld generates TypeScript definitions and documentation for Svelte components. It supports Svelte 3/4 (legacy `export let` syntax) and Svelte 5 (runes: `$props()`, `$state`, `$derived`, Snippet).

## Parsing Pipeline

### 1. Input

- **Plugin path**: Reads `.svelte` files via Vite plugin, preprocesses with `svelte-preprocess` (TypeScript, strip styles), then passes to `ComponentParser`.
- **CLI/fixtures path**: Reads raw `.svelte` source directly, no preprocess.

### 2. Script Extraction

- Source is cleaned: TypeScript directives (`// @ts-ignore`, etc.) are stripped from `<script>` blocks via `stripTypeScriptDirectivesFromScripts()`.
- Script blocks are matched with `SCRIPT_BLOCK_REGEX`: `/(<script[^>]*>)([\s\S]*?)(<\/script>)/gi`.

### 3. Compilation / AST

- **Svelte 4 components**: `svelte/compiler` `compile()` succeeds. AST has:
  - `ast.module` – module script (`<script context="module">`)
  - `ast.instance` – instance script (default `<script>`)
  - `ast.html` – template
- **Svelte 5 runes components**: `compile()` fails with "Complex binding patterns require an initialization value" because Svelte 4 compiler does not support `let { x } = $props()`.
- **Fallback for Svelte 5**: When `compile()` throws, veld extracts instance script content and parses it with the TypeScript compiler API (`ts.createSourceFile`) to find `$props()` patterns. Only props are extracted; slots/events remain empty.

### 4. Prop Extraction

#### Legacy (Svelte 3/4)

- Walks `ast.module` and `ast.instance` via `estree-walker`.
- Looks for `ExportNamedDeclaration` with `VariableDeclaration` or `FunctionDeclaration`.
- For `export let foo = 1`:
  - Prop name from `VariableDeclarator.id`
  - Default from `processInitializer(init)` (literal or expression string)
  - Type from JSDoc `@type`, interface lookup, or inferred
  - Required if `kind === "let"` and `init == null`

#### Svelte 5 Runes

- Uses `extractSvelte5Props(scriptContent)` in `src/extractors/svelte5Props.ts`.
- Parses script with `ts.createSourceFile()`.
- Finds `VariableDeclaration` where `init` is `CallExpression` and `callee` is `$props`.
- Extracts from `ObjectBindingPattern`:
  - Prop name: `propertyName` or `name` (for renames: `{ long: short }` → doc name is `long`)
  - Default: `initializer` text
  - Type: from type annotation (interface or inline type literal)
  - Optional: `?` on property or presence of default
- Ignores rest element (`...rest`).
- `$derived` / `$derived.by` / `$state` are not treated as props.

### 5. Output Data Model

- **ComponentProp**: `{ name, kind, type?, value?, description?, isRequired, constant, reactive, ... }`
- **ParsedComponent**: `{ props, moduleExports, slots, events, typedefs, generics, rest_props, contexts }`
- **ComponentDocApi**: `ParsedComponent & { filePath, moduleName }`

### 6. Writers

- **TypeScript**: `writer-ts-definitions*.ts` – `.d.ts` files
- **JSON**: `writer-json.ts` – `.api.json` per component or combined
- **Markdown**: `writer-markdown*.ts` – docs

## Extension Points

1. **Svelte 5 detection**: Regex `/\$props\s*\(/` on script content before/after compile.
2. **Prop extractor**: `extractSvelte5Props()` is a pure function; can be unit-tested in isolation.
3. **Integration**: `ComponentParser.parseSvelteComponent()` catches compile errors and invokes Svelte 5 extractor when appropriate.

## Svelte 5 Fallback: Props-Only Extraction (Structural Limitation)

The extraction pipeline is: **Svelte 4 compiler → fail → TypeScript AST fallback**. Because we rely on the Svelte 4 compiler first, we cannot extract slots, events, or contexts when it fails (Svelte 5 runes syntax). The fallback uses `ts.createSourceFile()` on the script content only—it has no access to the template AST.

| Extracted | Legacy (Svelte 3/4) | Svelte 5 Fallback |
|-----------|---------------------|-------------------|
| Props     | ✅                  | ✅                |
| Slots     | ✅                  | ❌                |
| Events    | ✅                  | ❌                |
| Contexts  | ✅                  | ❌                |

This is a structural limitation, not a bug. Slots, events, and contexts require the Svelte compiler’s template AST. The TypeScript fallback only sees `<script>` content.

**Long-term**: As Svelte 4 becomes irrelevant, the Svelte 5 compiler will become the dominant path. Until then, Svelte 5 runes components will only have props documented. Use `--debug` to see `extractionMode: "svelte5-fallback"` in JSON output.

## Risks

1. **Svelte version**: veld uses Svelte 4 compiler. Svelte 5 components fail to compile; we rely on TypeScript-only parsing for props. Slots/events for Svelte 5 are not extracted until Svelte 5 compiler is used.
2. **Type resolution**: No cross-file type resolution. Interface `Props` must be defined in the same script.
3. **Preprocess**: Plugin preprocesses with `typescript()` which may strip types; CLI/fixtures use raw source. Type extraction works when types are present in the source.
4. **Determinism**: Output ordering is sorted by `moduleName` for JSON; prop order follows source order.

## Test Strategy

- **Unit**: `extractSvelte5Props()` with script strings; assert `PropDoc[]`.
- **Integration**: Run veld against `test/fixtures/` and `test/fixtures/svelte5-runes/`; snapshot JSON output.
- **Regression**: Existing Svelte 3/4 fixtures must pass unchanged.
- **Snapshots**: Bun `expect().toMatchSnapshot()` for JSON and `.d.ts` outputs.
