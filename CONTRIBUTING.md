# Contributing to Grid Genius

Thanks for your interest! This document covers everything a new contributor needs to start hacking productively.

> **Heads up:** until ADR-001 is resolved the repo has no `LICENSE` file, which means external PRs technically can't be merged. Internal contributions and forks-for-personal-use are welcome.

## Prerequisites

- Node 20+ (Node 22 also tested)
- npm 10+

## Setup

```bash
git clone <repo-url>
cd code
npm install
npm run dev
```

The dev server starts on <http://localhost:3000>. Vite hot-reloads on save.

## Quality bars

Every change must keep these green:

```bash
npx tsc --noEmit         # type-checks
npm run lint             # ESLint with --max-warnings 0
npm test                 # Vitest run
npm run build            # production build
```

CI will enforce these once `EPIC-08` lands; until then please run them locally before opening a PR.

## Project conventions

### Repo layout

See [`README.md`](./README.md#project-layout) for the high-level tree. The boundaries that matter:

- `src/utils/` — **pure** functions only. No React, no DOM, no Zustand. Easy to test.
- `src/store/` — Zustand slices. Side-effect handles (timer IDs etc.) live in module scope, **not** observable state, so mutating them never re-renders consumers. See `gameStore.ts` for the pattern.
- `src/components/` — React only. UI subscribes to the store via selector form: `useGameStore(s => s.score)`, not destructured.
- `src/types/` and `src/constants/` — plain TypeScript. No imports from React/store.

### Logging

Use `src/utils/logger.ts` instead of `console.*`. ESLint enforces this.

- `logger.debug` / `info` / `log` are stripped in production builds.
- `logger.warn` / `error` always pass through.

### Testing

We use **Vitest + React Testing Library** with a jsdom environment.

- Unit tests for pure logic (utils, store reducers): `*.test.ts` next to the file.
- Component smoke tests: `*.test.tsx` next to the component.
- The test setup file is `src/test/setup.ts` — add jsdom shims there.
- Prefer `vi.useFakeTimers()` whenever your code uses `setInterval` / `setTimeout`.

### Styling

Tailwind utility classes. Avoid bespoke CSS unless animation truly needs it. Theme tokens (light/dark, skins) come in Phase 1 (`EPIC-12`); for now stick to literal Tailwind classes.

### Commits

Conventional-Commits-ish, but not enforced:

- `feat: add daily puzzle screen` — user-visible new behavior
- `fix: stop time-attack interval leaking on remount` — bug fix
- `chore: bump vitest to 4.1` — internal hygiene
- `docs: update ADR-002` — docs only
- `refactor: extract puzzle-rating module` — no behavior change
- `test: add gridGenerator regression for empty combos`

If your change closes a backlog task, mention the ID in the body: `Closes EPIC-05.03`.

### Documentation is part of the change

The docs folder is the source of truth, not an afterthought. When you land a change:

1. **Flip the matching checkbox in [`docs/BACKLOG.md`](./docs/BACKLOG.md)** from `[ ]` or `[~]` to `[x]`. Add a short note about what was actually done.
2. **Add an entry to [`docs/CHANGELOG.md`](./docs/CHANGELOG.md)** under "Unreleased" in the right section (Added / Changed / Fixed / Removed). Reference the EPIC ID.
3. **If you made an architectural choice with non-obvious trade-offs**, append a numbered ADR to [`docs/DECISIONS.md`](./docs/DECISIONS.md). ADRs are immutable once `Accepted` — supersede with a new ADR rather than editing.
4. **If your change touches a diagram or boundary in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**, update it.
5. **If you introduced a new domain term**, add it to [`docs/GLOSSARY.md`](./docs/GLOSSARY.md).

PRs that ship code without updating the relevant doc will be asked to add it before merge.

## Workflow

1. Pick a task from [`docs/BACKLOG.md`](./docs/BACKLOG.md) (anything `[ ]` is fair game).
2. Branch off `main`: `git checkout -b epic-NN-short-summary`.
3. Flip the task to `[~]` in the same branch and push.
4. Implement. Keep commits small and reviewable.
5. Run the four quality-bar commands locally.
6. Open a PR titled `EPIC-NN.MM: short description`. Use the PR template.
7. After merge, flip the task to `[x]` and add the changelog entry (often these go in the PR itself).

## Releases

We follow [Semantic Versioning](https://semver.org/).

- Phase 0 → `v0.1.x`
- Phase 1 → `v0.2.x`
- … through Phase 5 → `v0.6.x`
- Public launch → `v1.0.0`

When cutting a release:

1. Move the "Unreleased" block in `docs/CHANGELOG.md` under a dated `vX.Y.Z` header.
2. Bump `package.json.version`.
3. Tag the commit `vX.Y.Z` and push.
4. (Once `EPIC-08` ships) the deploy workflow builds and publishes to `gh-pages` automatically.

## Reporting bugs / requesting features

Open a GitHub Issue using one of the templates under `.github/ISSUE_TEMPLATE/`.

## Questions

Open a GitHub Discussion (or Issue if Discussions aren't enabled yet). The maintainers don't have a private support channel.
