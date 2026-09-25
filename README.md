# OGCR-App

A web interface for the OGCR carbon registry. It talks to the registry (the DCR)
through the [Open Bank Project](https://www.openbankproject.com) API and its dynamic
entities — the registry owns the carbon-activity data; this app presents it, and lets
operators list their activities on the marketplace.

Built with SvelteKit 5, Skeleton 4 and Tailwind v4.

## Requirements

- Node 22
- Redis (session store)
- An OBP API instance, and an OIDC provider for login

## Getting started

```bash
cp .env.example .env    # then fill in OBP URL, OAuth client, SESSION_SECRET
npm install
npm run dev             # http://localhost:5200
```

`.env.example` documents every variable, which are required, and which are optional.
`SESSION_SECRET` must be set (`openssl rand -hex 32`).

Alternatively, `docker compose up` builds the app and starts Redis alongside it on port
3000; it reads the same variables from the environment.

## Commands

| Command                           | What it does                                  |
| --------------------------------- | --------------------------------------------- |
| `npm run dev`                     | Dev server on port 5200                       |
| `npm run build`                   | Production build (`@sveltejs/adapter-node`)   |
| `npm run preview`                 | Serve the production build                    |
| `npm run check`                   | `svelte-check` over the project               |
| `npm run check:design-tokens`     | Check mirrored design tokens against upstream |
| `npm run test:unit -- --run`      | Unit tests (vitest)                           |
| `npm run test:e2e`                | End-to-end tests (Playwright)                 |
| `npm run test`                    | Both suites                                   |
| `npm run lint` / `npm run format` | Prettier check / write                        |

## Design system tokens

This app cannot import the [OGCR Design System](https://github.com/Maji-Studio/ogcr)
components — it is React, this app is Svelte — so `src/ogcr-design-system-reference.css`
mirrors its token _values_ by hand and `src/ogcr-theme.css` maps them onto Skeleton's
scale. A hand copy rots silently, so check it before design work and whenever the design
system releases:

```bash
npm run check:design-tokens
```

It diffs all 92 tokens against the published npm package (no clone needed) and exits 0 in
sync, 1 on drift, 2 if it could not check. It is deliberately not part of `npm run build`,
which would then need network access.

If it reports drift, see
[design_system_integration.md](./design_system_integration.md) — that also covers what is
pinned to which upstream commit, and which components have been ported to Svelte.

## Docs

|                                                                |                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [design_goals.md](./design_goals.md)                           | Why the marketplace lists registry activities rather than creating them |
| [design_system_integration.md](./design_system_integration.md) | How this app consumes the OGCR Design System                            |
| [chain_integration.md](./chain_integration.md)                 | How on-chain state reaches the app, and the heartbeat                   |
| [open_questions.md](./open_questions.md)                       | Unresolved design and product questions                                 |
| [CLAUDE.md](./CLAUDE.md)                                       | Notes on discovering OBP dynamic entity endpoints                       |
