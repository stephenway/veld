# Contributing

## Prerequisites

- [Bun](https://bun.sh/docs/installation)
- **Node 22+** (Node 18 is EOL and unsupported; we support Node 22 and 24 LTS)

## Set-up

Fork the repository and clone your fork:

```sh
git clone <YOUR_FORK>
cd veld
```

Set the original repository as the upstream:

```sh
git remote add upstream git@github.com:IBM/veld.git
# verify that the upstream is added
git remote -v
```

Finally, install the project dependencies:

```sh
bun install
```

## Workflow

### Unit tests

Ensure the unit tests pass by running `bun test`.

### Fixtures and goldens

Fixtures live in `tests/fixtures/`. Each fixture has:

- `input.svelte` – the component source
- `output.json` – generated API (written by tests)
- `output.d.ts` – generated TypeScript defs (written by tests)

**Adding a fixture:**

1. Create `tests/fixtures/<name>/input.svelte`
2. Run `CI=false bun test tests/fixtures.test.ts --update-snapshots`
3. Commit `input.svelte`, `output.json`, `output.d.ts`, and `tests/__snapshots__/fixtures.test.ts.snap`

**Updating goldens (after extractor changes):**

```sh
CI=false bun test tests/fixtures.test.ts --update-snapshots
```

Or use the automation script to update all goldens at once:

```sh
bun run update-goldens
```

**Svelte 5 runes fixtures:** Use `tests/fixtures/svelte5-runes/<Name>/input.svelte`. Module names are derived from the path (e.g. `svelte5-runes/Tooltip` → `Svelte5RunesTooltip`).

### CLI integration tests

CLI integration tests run the actual `veld` CLI against test workdirs and compare output to snapshots. Workdirs:

- `tests/cli/workdir-svelte5/` – Svelte 5 runes components
- `tests/cli/workdir-legacy/` – Svelte 3/4 components

**Updating CLI goldens:**

```sh
CI=false bun test tests/cli/cli-integration.test.ts --update-snapshots
```

Or run `bun run update-goldens` to update both fixture and CLI snapshots.

**Note:** Ensure `bun run build` has been run so `cli.js` exists. Tests use temp directories and normalize paths for stable snapshots.

### End-to-end (e2e) tests

Because this library is written in TypeScript, it must be transpiled to JavaScript before it can be used by e2e tests in the `tests/e2e` folder.

Run `bun run build` to build the library. The transpiled JavaScript code is emitted to the `lib` folder.

To build the library in watch mode, run `bun run build -w`.

### Continuous Integration

This project uses GitHub Actions for continuous integration (CI).

The CI matrix runs on:

- **Node:** 22, 24 (current and previous LTS; Node 18 is EOL)
- **OS:** ubuntu-latest, windows-latest, macos-15
- **Bun:** Pinned via `.bun-version`

Jobs build the library, run unit tests, lint, and type-check fixtures. The deploy step runs only on `main` (macos + node 22).

### Version bump and publish

- **Semver:** Follow [Semantic Versioning](https://semver.org/). Bump `version` in `package.json` before tagging.
- **Publish:** Push a tag `v*` (e.g. `v0.27.0`) to trigger the publish workflow. The workflow builds, prunes dev deps, and publishes to npm with provenance.

## Submitting a Pull Request

### Sync Your Fork

Before submitting a pull request, make sure your fork is up to date with the latest upstream changes.

```sh
git fetch upstream
git checkout main
git merge upstream/main
```

### Submit a PR

After you've pushed your changes to remote, submit your PR. Make sure you are comparing `<YOUR_USER_ID>/feature` to `origin/main`.
