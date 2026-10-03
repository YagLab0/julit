# Agent Rules

* Never assume anything. If requirements, context, or answers are uncertain or unknown, ask the user before proceeding.
* Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
* Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
* Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
* Keep components modular and concerns clearly separated.
* Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
* Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
* Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
* Use Conventional Commits for commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
* Write all code, comments, identifiers, and documentation in English. Only end-user-facing strings (UI text, toasts, user docs) go in Spanish.
* Never publish anything to GitHub — issues, pull requests, comments, or releases. This repository's issue tracker is local markdown: specs and tickets live under `.scratch/<feature-slug>/`.

## Frontend

Las reglas del frontend están en `FRONTEND.md`. Léelo antes de tocar `app/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
