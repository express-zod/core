# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`express-zod` is a TypeScript library for type-safe, schema-validated routing for
Express and Zod. It is scaffolded but **unimplemented**: `src/index.ts` is a
placeholder that exports nothing. Do not describe its API as working until that
changes.

## Commands

Run from the repository root.

```sh
pnpm test                              # vitest run
pnpm vitest run __test__/index.test.ts # single test file
pnpm vitest run -t "name"              # single test by name
pnpm typecheck                         # tsc --noEmit
pnpm build                             # bundle dist/ via tsdown
pnpm lint                              # oxlint
pnpm fmt                               # oxfmt (writes)
pnpm playground:start                  # run the playground workspace
```

Verify a change with `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm test`.

## Architecture

Three layers, and the way they connect is the main thing to understand:

- **`src/`** — the library. It is the published package; `files` in `package.json`
  limits the tarball to `dist/`, and `exports` points only at `./dist/index.js`.
- **`__test__/`** — the vitest suite, importing the library **by package name**.
- **`playground/`** — a pnpm workspace (`pnpm-workspace.yaml`) holding runnable
  demos. Unpublished, depends on nothing but `tsx`.

`playground/` and `__test__/` both import `express-zod` as a bare specifier, and
both resolve it to **live source** rather than `dist/`:

- `tsconfig.json` maps `express-zod` → `./src/index.ts` under `paths`
  (and `playground/tsconfig.json` re-maps it to `../src/index.ts`).
- `vitest.config.ts` repeats the mapping as a Vite `resolve.alias`.

So there is **no build step in the inner loop** — edit `src/`, run
`pnpm playground:start` or `pnpm test`, see the result. A consequence: `pnpm build`
is not exercised by the test suite, so run it before publishing. The alias and the
`paths` entry are duplicated deliberately and must be kept in sync; changing the
package name means updating both plus `package.json`.

**Building** is `tsdown` (Rolldown-based), configured in `tsdown.config.ts`. It
bundles `src/index.ts` to `dist/index.js` plus `dist/index.d.ts`. `tsconfig.json`
is now only used for `pnpm typecheck` and by tsdown for type resolution — there is
no `tsc`-based build config.

Two tsdown settings are load-bearing and easy to lose:

- `fixedExtension: false` — tsdown otherwise defaults to fixed extensions on
  `platform: "node"` and emits `.mjs`/`.d.mts`, which would not match the
  `exports` map in `package.json`.
- `dts: true` — declaration output. It is also inferred from the `types` field in
  `package.json`, so it is stated explicitly in the config rather than left implicit.

If you add entry points, update the `exports` field in `package.json` by hand to
match; tsdown's `exports: true` option can generate it automatically but rewrites
`package.json` on every build.

## Conventions

Formatting is 4-space indent, double quotes, semicolons, LF. This is set in
**two places that must agree**: `.oxfmtrc.json` and `.editorconfig` (oxfmt reads
the latter directly). Change both or the formatter and editor will disagree.

A husky pre-commit hook runs `lint-staged`, which applies `oxlint --fix` then
`oxfmt --write` to staged files. If the hook rewrites staged files, they must be
re-added before the commit lands.

## Environment gotchas

- **The package name is `express-zod`, but the directory is `express-zod-core`.**
  Don't "correct" one to the other.
- **`core.autocrlf=true` on this machine.** `.gitattributes` forces `eol=lf` to
  stop git and oxfmt fighting over line endings. Keep it.
- **pnpm blocks postinstall scripts by default.** `pnpm-workspace.yaml`
  allow-lists `esbuild` under `onlyBuiltDependencies`; without it vitest cannot
  run. Any new dependency with a build script needs adding there.
- `unicorn/require-module-specifiers` is disabled on the `export {}` in
  `src/index.ts`. It is an intentional placeholder — delete the disable comment
  once real exports exist.
- `.husky/_/` is generated per-machine and gitignored.
