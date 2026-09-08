# Repository Guidelines

## Project Structure & Module Organization

This is an Astro 7 blog with React/Preact islands and TypeScript. Application code lives in `src/`: routes and API endpoints are under `src/pages/`, reusable UI in `src/components/`, page shells in `src/layouts/`, Markdown processing in `src/markdown/`, and shared helpers in `src/utils/` and `src/lib/`. Global styles and theme tokens live in `src/styles/`. Static files and generated feed/map data belong in `public/`; repository automation belongs in `scripts/`.

`src/data/` is the separate `blog-data` Git submodule containing posts, Notes, attachments, and the generated public Wiki projection. Initialize it with `git submodule update --init --recursive` before changing content. Raw clips and Wiki source files remain in the private Obsidian Vault. Only allowlisted Wiki concepts reach `src/data/wiki/` through the export workflow; never restore `src/data/clip/` as a public content collection.

## Build, Test, and Development Commands

Use Node.js 22.23.2 and pnpm 10.11.0.

- `pnpm install --frozen-lockfile` installs the pinned dependencies.
- `pnpm dev` starts Astro at `http://localhost:4321`.
- `pnpm build` runs `astro check` and creates the production build.
- `pnpm preview` serves the built application locally.
- `pnpm test` runs the Vitest suite once; `pnpm test:watch` runs it interactively.
- `pnpm lint` checks TypeScript and Astro files with ESLint.
- `pnpm format:check` verifies Prettier formatting; `pnpm format` applies it.
- `pnpm verify:theme`, `pnpm verify:responsive`, and `pnpm verify:footprint` run targeted UI/build checks.

## Coding Style & Naming Conventions

Prettier enforces two-space indentation, semicolons, double quotes, 80-column lines, and Astro/Tailwind formatting. Keep TypeScript strict and prefer the `@/*` alias for `src/*`. Name Astro and React components in PascalCase (`CardCoverImage.astro`), utilities in camelCase (`withBase.ts`), and route files according to Astro conventions. Avoid editing generated directories such as `dist/`, `.astro/`, and `public/pagefind/`.

## Testing Guidelines

Vitest runs in the Node environment and discovers `src/**/*.test.ts`. Co-locate tests with the implementation and use descriptive suffixes such as `.integration.test.ts`, `.a11y.test.ts`, or `.semantics.test.ts` when appropriate. Add regression coverage for behavior changes. No numeric coverage threshold is enforced; run `pnpm test`, lint, formatting, and relevant verification scripts before submitting.

## Commit & Pull Request Guidelines

Follow Conventional Commits used in history: `feat(ui): ...`, `fix(navigation): ...`, or `perf(ui): ...`. Use an imperative, specific subject and explain key behavior, interface/data impacts, and verification in the body. Pull requests should summarize the change, link related issues, list validation performed, and include screenshots or recordings for visible UI changes. Call out content-submodule or configuration changes explicitly.
