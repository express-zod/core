# Contributing

## Requirements

- Node.js 22 or newer (developed on 24)
- pnpm 10 (`packageManager` in `package.json` pins the version)

## Setup

```sh
pnpm install
```

Installing also runs `husky` via the `prepare` script, which wires up the git hooks.
Everything else is run through pnpm scripts from the repository root.

## Layout

| Path          | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `src/`        | The library. Compiles to the published package.   |
| `__test__/`   | Vitest suite.                                     |
| `playground/` | pnpm workspace for runnable demos. Not published. |

`playground/` imports the library as `express-zod`, resolved by a `paths` alias in
`playground/tsconfig.json` to `../src/index.ts`. Demos therefore run against live
source and never need a build first.

## Scripts

| Command                 | Does                              |
| ----------------------- | --------------------------------- |
| `pnpm test`             | Run the suite once.               |
| `pnpm test:watch`       | Run the suite in watch mode.      |
| `pnpm build`            | Bundle `dist/` via tsdown.        |
| `pnpm typecheck`        | Type-check without emitting.      |
| `pnpm lint`             | Lint with oxlint.                 |
| `pnpm lint:fix`         | Lint and apply safe fixes.        |
| `pnpm fmt`              | Format with oxfmt.                |
| `pnpm fmt:check`        | Check formatting without writing. |
| `pnpm playground:start` | Run the playground demo.          |

Run a single test file or test case:

```sh
pnpm vitest run __test__/index.test.ts
pnpm vitest run -t "name of the test"
```

## Conventions

Formatting and lint rules are enforced by oxfmt and oxlint, configured in
`.oxfmtrc.json` and `.oxlintrc.json`. The important settings: 4-space indent,
double quotes, semicolons, LF line endings. `.editorconfig` mirrors these for
editors, and oxfmt reads it directly, so change both together if you change either.

A pre-commit hook runs `lint-staged`, which applies `oxlint --fix` and `oxfmt --write`
to staged files. If a hook rewrites your staged files, re-add them before committing.

Do not hand-format code to satisfy a diff; run `pnpm fmt` and let the tools decide.

## Commit messages

Write commit subjects in the imperative mood ("Add route validator", not "Added").
Keep the subject under 72 characters and use the body to explain why a change was
made when the reason is not obvious from the diff.

## Pull requests

Before opening one, confirm the full check passes locally:

```sh
pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm test
```

Note that `vite`/`vitest` and `esbuild` ship platform binaries through postinstall
scripts, which pnpm blocks by default. `pnpm-workspace.yaml` allow-lists `esbuild`
under `onlyBuiltDependencies`; if you add a dependency that needs a build script,
add it there too, or its binary will silently be missing.
