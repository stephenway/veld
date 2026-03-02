/**
 * Svelte 5 runes props extraction.
 *
 * Parses script content with TypeScript compiler API to find `$props()` destructuring
 * patterns. Used when Svelte 4 compiler fails on Svelte 5 syntax (e.g. "Complex binding
 * patterns require an initialization value").
 */

import * as ts from "typescript";

/**
 * Prop definition compatible with ComponentParser's ComponentProp.
 */
export interface Svelte5PropDoc {
  name: string;
  kind: "let" | "const" | "function";
  constant: boolean;
  type?: string;
  value?: string;
  description?: string;
  isFunction: false;
  isFunctionDeclaration: false;
  isRequired: boolean;
  reactive: boolean;
}

const PROPS_CALL_REGEX = /\$props\s*\(/;
const JSDOC_BLOCK_REGEX = /\/\*\*([\s\S]*?)\*\//;

/**
 * Extracts the instance script content from a .svelte file.
 * Returns the last non-module script block (instance script).
 * If only one script exists, returns its content.
 */
export function extractInstanceScript(source: string): string | null {
  const matches = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const attrs = (m[1] ?? "").toLowerCase();
    if (!attrs.includes('context="module"') && !attrs.includes("context='module'")) {
      return m[2] ?? "";
    }
  }
  return null;
}

/**
 * Checks if script content contains $props() pattern.
 */
export function hasPropsRune(scriptContent: string): boolean {
  return PROPS_CALL_REGEX.test(scriptContent);
}

/**
 * Extracts a string representation of a type node.
 */
function typeNodeToString(node: ts.TypeNode, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile).trim();
}

/**
 * Resolves a type reference (e.g. "Props") to its definition in the same script.
 */
function resolveTypeReference(
  typeName: string,
  sourceFile: ts.SourceFile,
): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | undefined {
  let found: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name?.getText(sourceFile) === typeName) {
      found = node;
    } else if (ts.isTypeAliasDeclaration(node) && node.name?.getText(sourceFile) === typeName) {
      found = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Extracts property info from an interface or type alias.
 */
function getPropertyInfoFromType(
  typeDecl: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
): Map<string, { type: string; optional: boolean; description?: string }> {
  const map = new Map<string, { type: string; optional: boolean; description?: string }>();

  let members: ts.NodeArray<ts.TypeElement> | undefined;
  if (ts.isInterfaceDeclaration(typeDecl)) {
    members = typeDecl.members;
  } else {
    const typeNode = typeDecl.type;
    if (ts.isTypeLiteralNode(typeNode)) {
      members = typeNode.members;
    }
  }
  if (!members) return map;

  for (const member of members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = (member.name as ts.Identifier)?.getText(sourceFile);
    if (!name || ts.isComputedPropertyName(member.name)) continue;

    const optional = !!member.questionToken;
    const type = member.type ? typeNodeToString(member.type, sourceFile) : "unknown";
    const description = getJSDocFromNode(member, sourceFile);

    map.set(name, { type, optional, description });
  }

  return map;
}

/**
 * Extracts property info from a type literal { a: string; b?: number }.
 */
function getPropertyInfoFromTypeLiteral(
  typeLiteral: ts.TypeLiteralNode,
  sourceFile: ts.SourceFile,
): Map<string, { type: string; optional: boolean; description?: string }> {
  const map = new Map<string, { type: string; optional: boolean; description?: string }>();
  for (const member of typeLiteral.members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = (member.name as ts.Identifier)?.getText(sourceFile);
    if (!name || ts.isComputedPropertyName(member.name)) continue;
    const optional = !!member.questionToken;
    const type = member.type ? typeNodeToString(member.type, sourceFile) : "unknown";
    const description = getJSDocFromNode(member, sourceFile);
    map.set(name, { type, optional, description });
  }
  return map;
}

/**
 * Formats JSDoc block content to a single-line description.
 */
function formatJSDocContent(blockContent: string): string {
  return blockContent
    .replace(/^\s*\*\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gets JSDoc description from a node's leading comment.
 * Prefers node.jsDoc when present; otherwise scans backwards but stops at
 * another property signature so comments are not mis-associated.
 */
function getJSDocFromNode(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getStart(sourceFile);

  if (ts.isPropertySignature(node)) {
    const jsDoc = (node as ts.Node & { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (jsDoc?.length) {
      const last = jsDoc[jsDoc.length - 1];
      const content = last.getText(sourceFile).replace(/^\/\*\*|\*\/$/g, "").trim();
      return formatJSDocContent(content) || undefined;
    }

    const parent = node.parent;
    if (parent && (ts.isInterfaceDeclaration(parent) || ts.isTypeLiteralNode(parent))) {
      const members = parent.members as ts.NodeArray<ts.TypeElement>;
      const idx = members.indexOf(node as ts.TypeElement);
      const searchStart = idx > 0 ? members[idx - 1].getEnd() : parent.getStart(sourceFile);
      const beforeNode = fullText.slice(searchStart, nodeStart);
      const matches = [...beforeNode.matchAll(new RegExp(JSDOC_BLOCK_REGEX.source, "g"))];
      const blockMatch = matches.at(-1);
      if (!blockMatch) return undefined;
      const jsDocEndInSlice = (blockMatch.index ?? 0) + blockMatch[0].length;
      const between = beforeNode.slice(jsDocEndInSlice);
      if (/[^\s]/.test(between)) return undefined;
      const content = formatJSDocContent(blockMatch[1]);
      return content || undefined;
    }
  }

  const beforeNode = fullText.slice(0, nodeStart);
  const matches = [...beforeNode.matchAll(new RegExp(JSDOC_BLOCK_REGEX.source, "g"))];
  const blockMatch = matches.at(-1);
  if (!blockMatch) return undefined;
  const content = formatJSDocContent(blockMatch[1]);
  return content || undefined;
}

/**
 * Extracts props from Svelte 5 $props() destructuring in script content.
 *
 * Supports:
 * - let { ... }: Props = $props();
 * - let { ... }: { ... } = $props();
 * - let { ... } = $props(); (no type)
 * - Destructuring renames: { longPropName: short = 'x' } -> doc name is longPropName
 * - Default values (literal or expression)
 * - Rest element (...rest) is ignored
 */
export function extractSvelte5Props(scriptContent: string): Svelte5PropDoc[] {
  const sourceFile = ts.createSourceFile("script.ts", scriptContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const props: Svelte5PropDoc[] = [];
  const typeInfoMap = new Map<string, { type: string; optional: boolean; description?: string }>();

  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node)) {
      const declList = node.declarationList;
      for (const decl of declList.declarations) {
        const init = decl.initializer;
        if (!init || !ts.isCallExpression(init)) continue;
        const call = init;
        const calleeText = call.expression.getText(sourceFile);
        if (calleeText !== "$props") continue;

        const id = decl.name;
        if (!ts.isObjectBindingPattern(id)) continue;

        const typeNode = decl.type;
        if (typeNode) {
          if (ts.isTypeReferenceNode(typeNode)) {
            const typeName = (typeNode.typeName as ts.Identifier)?.getText(sourceFile);
            if (typeName) {
              const typeDecl = resolveTypeReference(typeName, sourceFile);
              if (typeDecl) {
                const info = getPropertyInfoFromType(typeDecl, sourceFile);
                for (const [k, v] of info) {
                  typeInfoMap.set(k, v);
                }
              }
            }
          } else if (ts.isTypeLiteralNode(typeNode)) {
            const info = getPropertyInfoFromTypeLiteral(typeNode, sourceFile);
            for (const [k, v] of info) {
              typeInfoMap.set(k, v);
            }
          }
        }

        for (const el of id.elements) {
          if (ts.isSpreadElement(el)) continue;
          if (el.dotDotDotToken) continue; // ...rest - do not document as prop

          const propName = el.propertyName
            ? (el.propertyName as ts.Identifier).getText(sourceFile)
            : (el.name as ts.Identifier).getText(sourceFile);
          const hasDefault = !!el.initializer;
          const defaultText = el.initializer?.getText(sourceFile)?.trim();

          const info = typeInfoMap.get(propName);
          const type = info?.type ?? "unknown";
          const optionalFromType = info?.optional ?? true;
          const optional = optionalFromType || hasDefault;
          const description = info?.description;

          props.push({
            name: propName,
            kind: "let",
            constant: false,
            type: type || undefined,
            value: defaultText,
            description,
            isFunction: false,
            isFunctionDeclaration: false,
            isRequired: !optional,
            reactive: false,
          });
        }

        typeInfoMap.clear();
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return props;
}

/**
 * Extracts Svelte 5 props from full .svelte source.
 * Returns null if no $props() pattern is found.
 */
export function extractSvelte5PropsFromSource(source: string): Svelte5PropDoc[] | null {
  const scriptContent = extractInstanceScript(source);
  if (!scriptContent || !hasPropsRune(scriptContent)) return null;
  return extractSvelte5Props(scriptContent);
}
