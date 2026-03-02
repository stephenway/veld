# veld Playground

Interactive playground for testing veld's component extraction. Uses `@rasterandstate/majestic-ui` for the UI.

## Setup

### Installing `@rasterandstate/majestic-ui`

The playground depends on `@rasterandstate/majestic-ui`. Use the config that matches where the package is published:

**GitHub Packages** (default):

```bash
cp .npmrc.github .npmrc
# Add NODE_AUTH_TOKEN to .env (read:packages scope), then:
bun run setup
```

`bun run setup` loads `.env` before installing, so `NODE_AUTH_TOKEN` is available to the registry.

**Public npm**:

```bash
cp .npmrc.npm .npmrc
bun install
```

## Development

```bash
bun run dev
```
