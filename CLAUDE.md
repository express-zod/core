# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`express-zod` is a TypeScript library for type-safe, schema-validated routing for
Express and Zod. The routing API is implemented: `src/index.ts` exports the
`Router` class from `src/router.ts`, backed by the `Middleware` helper in
`src/middleware.ts` and the inference layer under `src/types/`.

It is pre-release, and the runtime surface is deliberately narrow — only `Router`
is exported; `Middleware`, `toValidation` and `splitArgs` are internal. The
playground is still a stub.

## Commands

Run from the repository root.

```sh
pnpm test                              # vitest run (runtime + type tests)
pnpm vitest run __test__/router.test.ts # single test file
pnpm vitest run -t "name"              # single test by name
pnpm typecheck                         # tsc --noEmit
pnpm build                             # bundle dist/ via tsdown
pnpm check:package                     # publint + attw against the built dist/
pnpm lint                              # oxlint
pnpm fmt                               # oxfmt (writes)
pnpm playground:start                  # run the playground workspace
```

Verify a change with `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm test`,
and add `pnpm build && pnpm check:package` when you have touched anything that
affects the published shape of the package.

## Architecture

Three layers, and the way they connect is the main thing to understand:

- **`src/`** — the library. It is the published package; `files` in `package.json`
  limits the tarball to `dist/`, and `exports` maps the root specifier onto the
  ESM/CJS pair in `dist/`.
- **`__test__/`** — the vitest suite, importing the library **by package name**.
  Runtime tests (`*.test.ts`) drive the router over HTTP with `supertest`; type
  tests (`*.test-d.ts`) assert the exported type layer with `expectTypeOf`, and are
  run by vitest's typecheck, which shells out to `tsc`. Vitest globals are on, so
  tests do not import `describe`/`it`/`expect`.
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
bundles `src/index.ts` into four files: `dist/index.mjs` plus `dist/index.d.mts`
for ESM, and `dist/index.cjs` plus `dist/index.d.cts` for CommonJS. The package
ships both because the Express ecosystem still has a large CommonJS population.
`tsconfig.json` is now only used for `pnpm typecheck` and by tsdown for type
resolution — there is no `tsc`-based build config.

Two tsdown settings are load-bearing and easy to lose:

- `fixedExtension: true` — this is what stops the two formats colliding. With it
  off, tsdown emits both as `index.js` and one format is silently lost. The exact
  `.mjs`/`.cjs` and `.d.mts`/`.d.cts` names are hard-coded in the `exports` map in
  `package.json`, so the two must change together.
- `dts: true` — declaration output. It is also inferred from the `types` field in
  `package.json`, so it is stated explicitly in the config rather than left implicit.

If you add entry points, update the `exports` field in `package.json` by hand to
match; tsdown's `exports: true` option can generate it automatically but rewrites
`package.json` on every build.

`pnpm check:package` runs `publint` and `attw` against the built tarball, and CI
runs it after the build. The test suite cannot cover this: it resolves
`express-zod` to live source, so the emitted bundle is never exercised by a test.

## Conventions

Formatting is 4-space indent, double quotes, semicolons, LF. This is set in
**two places that must agree**: `.oxfmtrc.json` and `.editorconfig` (oxfmt reads
the latter directly). Change both or the formatter and editor will disagree.

A husky pre-commit hook runs `lint-staged`, which applies `oxlint --fix` then
`oxfmt --write` to staged files. If the hook rewrites staged files, they must be
re-added before the commit lands.

Commit messages follow `.claude/commands/commit.md`: Vue-style Conventional
Commits, with the body written as a short bullet list rather than a paragraph.

## Environment gotchas

- **The package name is `express-zod`, but the directory is `express-zod-core`.**
  Don't "correct" one to the other.
- **`core.autocrlf=true` on this machine.** `.gitattributes` forces `eol=lf` to
  stop git and oxfmt fighting over line endings. Keep it.
- **pnpm blocks postinstall scripts by default.** `pnpm-workspace.yaml`
  allow-lists `esbuild` under `onlyBuiltDependencies`; without it vitest cannot
  run. Any new dependency with a build script needs adding there.
- `no-shadow` is disabled locally in `src/router.ts` and `src/middleware.ts`, where
  the inner `Router`/`Middleware` classes share a name with the type they get cast
  to. Intentional — drop the disables only together with that cast.
- `typescript/no-explicit-any` is off in `.oxlintrc.json`: the router internals
  bridge Express's overloads with `any`.
- `.husky/_/` is generated per-machine and gitignored.
