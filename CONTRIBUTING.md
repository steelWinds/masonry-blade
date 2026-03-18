# Contributing to masonry-blade

Thanks for your interest in contributing to `masonry-blade` ❤️

This project is a low-level masonry layout engine focused on predictable behavior, small surface area, and zero runtime dependencies. Contributions are welcome, but please keep changes focused and minimal.

## Before You Start

Please first check:

- the existing issues
- the current README / API behavior
- whether the change is a bug fix, documentation improvement, test improvement, or a narrowly scoped feature

For security-related reports, please **do not** open a public issue. Follow the instructions in `SECURITY.md`.

## Development Setup

### Requirements

- Node.js `>=18`
- `pnpm`

### Install

```bash
git clone https://github.com/steelWinds/masonry-blade
cd masonry-blade
pnpm install
```

## Useful Commands

```bash
pnpm build
pnpm test
pnpm test:run
pnpm test:coverage
pnpm lint
pnpm lint:fix
pnpm fmt
pnpm fmt:check
pnpm benchmark
```

## Contribution Types

Good contributions include:

- bug fixes
- tests for edge cases
- documentation clarifications
- type improvements
- performance improvements with evidence
- small API improvements that do not make the library more complex

Please avoid sending large unrelated changes in one PR.

## Guidelines

### Keep the scope small

This library is intentionally narrow:

- it is an engine, not a UI component
- it does not manage DOM rendering
- it does not implement framework-specific integrations
- it currently works with image-based masonry input

If you want to propose a broader feature, open an issue first and explain the use case.

### Preserve API clarity

Try to avoid changes that:

- increase surface area without strong value
- introduce implicit behavior
- make the matrix state harder to reason about
- couple the library to a specific framework or rendering strategy

### Prefer explicit tests

For behavior changes, please add or update tests.

Especially useful are tests for:

- invalid input handling
- mutation matrix state
- resize / matrix recreation behavior
- item ordering guarantees
- concurrency / serialization expectations
- worker and non-worker execution paths
- edge cases around zero/empty states

### Be careful with performance claims

If your change improves performance, include one of the following:

- a benchmark update
- a reproducible measurement
- a short explanation of the trade-off

Do not optimize readability away for tiny wins unless the gain is clearly meaningful.

## Pull Requests

### Before opening a PR

Please run:

```bash
pnpm lint
pnpm fmt:check
pnpm test:run
pnpm build
```

If your change affects performance-sensitive code, also run:

```bash
pnpm benchmark
```

### PR recommendations

A good PR should:

- have a clear title
- explain **what** changed and **why**
- stay focused on one problem
- include tests when applicable
- update documentation when public behavior changes

### PR size

Smaller PRs are much easier to review and merge.

If possible, split unrelated refactors from actual behavior changes.

## Commit Style

Follow the instructions with [Conventional Commits](https://www.conventionalcommits.org)

## Reporting Bugs

When opening a bug report, please include:

- package version
- runtime/environment
- minimal reproduction
- expected behavior
- actual behavior

A small code sample is much better than a long description.

## Suggesting Features

Feature requests are welcome, but please keep in mind the project goals:

- small
- predictable
- low-level
- framework-agnostic

When proposing a feature, explain:

- the problem
- why the current API is not enough
- the smallest possible addition that solves it

## Documentation Contributions

Docs improvements are always welcome, especially if they improve:

- wording clarity
- API explanations
- examples
- edge-case notes
- English/Russian consistency

## Code Style

The project uses automated formatting and linting tools.
Please let the configured tools define formatting and avoid manual stylistic churn.

## License

By contributing, you agree that your contributions will be distributed under the same license as the project.

## Thanks

Thanks for helping improve `masonry-blade`.
Focused contributions, careful tests, and clear explanations are especially appreciated.
