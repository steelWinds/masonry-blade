# Contributing to masonry-blade

Thanks for your interest in contributing to `masonry-blade`.

`masonry-blade` is a low-level masonry layout engine with a small API surface, predictable behavior, and zero runtime dependencies. Contributions are welcome, but changes should stay focused and justified.

## Before you open an issue or PR

Please check:

- existing issues and pull requests
- the current README and public API behavior
- whether the change is a bug fix, test improvement, docs improvement, or a narrowly scoped feature

For security issues, do not open a public issue. See `SECURITY.md`.

## Development setup

### Requirements

- Node.js `>=20.19.0`
- `pnpm`

### Install

```bash
git clone https://github.com/steelWinds/masonry-blade
cd masonry-blade
pnpm install
```

## Available commands

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

## What makes a good contribution

Good contributions usually include:

- bug fixes
- tests for edge cases and regressions
- documentation improvements
- type-level improvements
- performance improvements backed by evidence
- small API improvements that keep the library simple

Please avoid unrelated changes in the same pull request.

## Project boundaries

This library is intentionally narrow.

It is:

- a masonry layout engine
- framework-agnostic
- focused on image-based masonry input

It is not:

- a UI component
- a DOM renderer
- a framework integration layer

If you want to propose a broader feature, open an issue first and explain the use case.

## Contribution guidelines

### Keep the scope small

Prefer changes that solve one problem well.

Avoid changes that:

- increase the public API without strong value
- add implicit or hard-to-explain behavior
- make internal state harder to reason about
- couple the project to a specific framework or rendering strategy

### Add tests for behavior changes

If you change behavior, add or update tests.

Especially useful tests cover:

- invalid input handling
- matrix state mutations
- resize and matrix recreation behavior
- item ordering guarantees
- concurrency and serialization expectations
- worker and non-worker execution paths
- zero and empty-state edge cases

### Be careful with performance claims

If a change improves performance, include at least one of the following:

- a benchmark update
- a reproducible measurement
- a short explanation of the trade-off

Do not trade away readability for tiny gains unless the benefit is clear.

## Pull requests

### Before opening a PR

Please run:

```bash
pnpm lint
pnpm fmt:check
pnpm test:run
pnpm build
```

If your change touches performance-sensitive code, also run:

```bash
pnpm benchmark
```

### What a good PR looks like

A good pull request should:

- have a clear title
- explain what changed and why
- stay focused on one problem
- include tests when applicable
- update documentation when public behavior changes

### Keep PRs small

Smaller pull requests are easier to review and merge.

If possible, separate refactors from behavior changes.

## Commit style

Please follow [Conventional Commits](https://www.conventionalcommits.org).

## Bug reports

When reporting a bug, include:

- package version
- runtime or environment details
- minimal reproduction
- expected behavior
- actual behavior

A small reproducible example is much more useful than a long description.

## Feature requests

Feature requests are welcome, but they should fit the project goals:

- small
- predictable
- low-level
- framework-agnostic

When proposing a feature, explain:

- the problem
- why the current API is not enough
- the smallest useful addition

## Documentation contributions

Documentation improvements are always useful, especially when they improve:

- wording clarity
- API explanations
- examples
- edge-case notes
- consistency across English and Russian docs

## Code style

The project uses automated formatting and linting.

Please rely on the configured tools and avoid manual stylistic churn.

## License

By contributing, you agree that your contributions will be distributed under the same license as the project.

## Thanks

Thanks for helping improve `masonry-blade`.

Focused changes, clear reasoning, and careful tests are especially valuable.
