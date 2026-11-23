# Grid Genius — Documentation

This folder is the source of truth for product direction, engineering plan, and progress tracking. All documents are **living** — update them in the same PR that lands the change.

## Files

| File                                           | Purpose                                                                                            | Update cadence                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`VISION.md`](./VISION.md)                     | What Grid Genius is, who it's for, guiding principles, lichess-inspired pillars                    | Quarterly                     |
| [`ROADMAP.md`](./ROADMAP.md)                   | Phases (P0 → P5), epics, milestones, success metrics                                               | Per release                   |
| [`BACKLOG.md`](./BACKLOG.md)                   | Concrete tasks (checkboxes) grouped by epic. The active to-do list.                                | Per task                      |
| [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) | What must be true before public launch: blockers by area (backend, multiplayer, privacy, UI, docs) | Until launch                  |
| [`CHANGELOG.md`](./CHANGELOG.md)               | What shipped, when, in which version. Keep-a-Changelog format.                                     | Per release                   |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)         | Current system design + target architecture across phases                                          | When design changes           |
| [`DECISIONS.md`](./DECISIONS.md)               | Architecture Decision Records (ADRs) — why we chose X over Y                                       | Per decision                  |
| [`GLOSSARY.md`](./GLOSSARY.md)                 | Domain terms (puzzle, theme, rating, arena, swiss, …)                                              | When new term enters codebase |

## How to update

1. **When you start a task**: move it from "Up next" to "In progress" in `BACKLOG.md`. Open a PR titled `<EPIC-ID>: short summary`.
2. **When you finish**: tick the checkbox in `BACKLOG.md`, add a one-line entry under "Unreleased" in `CHANGELOG.md`, link the PR.
3. **When you ship a version**: move the "Unreleased" block in `CHANGELOG.md` under a dated version header, bump `package.json`, tag the commit `vX.Y.Z`.
4. **When you make an architectural choice with non-obvious trade-offs**: append a numbered ADR in `DECISIONS.md`.

## Conventions

- **Epic IDs**: `EPIC-NN` (zero-padded, monotonically assigned).
- **Task IDs**: `EPIC-NN.MM` (e.g. `EPIC-03.07`).
- **Statuses**: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled.
- **Priority labels**: `P0` blocker, `P1` must-have for next release, `P2` nice-to-have, `P3` future.
- **Estimates** (T-shirt): `XS` <½d · `S` ½–1d · `M` 1–3d · `L` 3–7d · `XL` >1w.

## Quick links

- Public site: <https://anirudhk.github.io/bingo>
- Inspiration: <https://lichess.org>
