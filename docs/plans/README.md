# Plans

Long-lived design plans for in-flight or upcoming epics. Each plan is a single
markdown file scoped to one epic.

A plan lives here when:

- The epic is large enough that a single backlog line undersells it (~> 1 week).
- It involves a real product decision worth recording, not just a refactor.
- It will outlive the conversation it was born in.

Smaller work goes straight into `BACKLOG.md` line items. Architectural decisions
that are _just_ decisions (not implementation walk-throughs) go into
`DECISIONS.md` as ADRs.

## Conventions

- File name: `EPIC-NN-short-slug.md` (e.g. `EPIC-10-learning-path.md`).
- Sections to include: `Overview`, `Goals`, `Information architecture` (mermaid
  if it helps), `Engine / data changes`, `UI surfaces`, `Tests`, `Back-compat`,
  `Out of scope`, `Documentation updates`, `Quality gates`,
  `Suggested execution order`.
- Once the epic ships, the plan stays as a historical record. Mark it at the top
  with `**Status: shipped in vX.Y.Z**` and link the changelog entry. Do not
  delete it — future epics often need to know _why_ we built something a
  particular way.

## Index

- [EPIC-25 — Learning Path & Hybrid Lobby](./EPIC-10-learning-path.md) —
  shipped to `[Unreleased]` (file slug kept as `EPIC-10-learning-path.md`
  for URL stability; EPIC-10 was already taken by Keyboard navigation).
