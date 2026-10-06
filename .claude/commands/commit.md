---
description: Commit the current changes with a Vue-style conventional commit message
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*), Read, Grep, Glob
---

Create a git commit for the current changes, using the commit message convention
from the Vue.js core repository.

## Format

Conventional Commits with a scope:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Only the header is required. The scope, body and footer are all optional.

### Type

Must be one of:

- `feat` — a new feature
- `fix` — a bug fix
- `docs` — documentation only
- `style` — changes that do not affect meaning (whitespace, formatting, semicolons)
- `refactor` — a change that neither fixes a bug nor adds a feature
- `perf` — a change that improves performance
- `test` — adding missing tests, or correcting existing ones
- `build` — changes to the build system or external dependencies
- `ci` — changes to CI configuration files and scripts
- `chore` — other changes that do not modify `src/` or `__test__/`
- `revert` — reverts a previous commit

### Scope

The affected area, in parentheses.

Vue's scope list is its monorepo package names, which does not apply here — this
is a single package. Pick a meaningful area of the repository instead: `deps`,
`ci`, `exports`, `types`, `readme`, `playground`, `release`. Omit the parentheses
entirely when nothing fits.

### Subject

- imperative present tense: "add", not "added" or "adds"
- lowercase first letter
- no period at the end
- short enough to read at a glance

### Body

Optional. Prefer a short list — one bullet per change — over a paragraph of
prose. Explain **why** the change was made; the diff already shows _what_. Wrap
at 72 columns. Separate it from the header with one blank line.

```
- add the Router class and the Middleware helper
- turn typescript/no-explicit-any off in .oxlintrc.json
```

### Footer

Optional. `BREAKING CHANGE: <description>` for breaking changes, and issue
references such as `Closes #12`.

## Steps

1. Run `git status` and `git diff`, plus `git diff --staged`. If work is already
   staged and only that should be committed, work from `git diff --staged` alone.
2. Run `git log --oneline -10` for context on the repository's existing tone.
3. Stage the relevant files explicitly by name. Do not reach for `git add -A` or
   `git add .` — look for files that should not be committed (secrets, `.env`,
   large binaries, unrelated work in progress) and leave them out.
4. Draft the message. If the change spans several unrelated concerns, say so and
   propose splitting it rather than writing one vague subject.
5. Commit with a heredoc, so the blank lines and wrapping survive:

```sh
git commit -F - <<'EOF'
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
```

6. The husky pre-commit hook runs `lint-staged` (`oxlint --fix` then
   `oxfmt --write`). It re-stages anything it rewrites; confirm with `git status`
   afterwards that the tree is clean.
7. Do **not** push. Report the resulting hash and subject.

Never invent a scope or a type just to fill out the format. If nothing fits, use
`chore` and leave the scope off.
