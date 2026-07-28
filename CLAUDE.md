# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus 3.9 documentation site for ImapFlow, a modern IMAP client library for Node.js. The site documents the library's API, usage patterns, and provides code examples.

## Commands

```bash
npm start          # Start dev server (hot reload)
npm run build      # Build static site to ./build
npm run serve      # Serve production build locally
npm run clear      # Clear Docusaurus cache (use when build issues occur)
npm run typecheck  # Run TypeScript type checking
```

## Architecture

- **docusaurus.config.ts** - Main configuration: site metadata, navbar, footer, Algolia search, Mermaid diagrams
- **sidebars.ts** - Sidebar navigation structure with manual ordering and EmailEngine banner
- **docs/** - All documentation content in MDX format
- **src/pages/index.tsx** - Custom homepage with feature highlights
- **src/components/** - React components (HomepageFeatures)
- **src/css/custom.css** - Custom styles and CSS variables

## Documentation Content Guidelines

- All docs reference the ImapFlow library source at `../imapflow` - verify claims against source code
- Include RFC links for all IMAP extensions (e.g., RFC 2177 for IDLE, RFC 7162 for CONDSTORE/QRESYNC)
- Use Mermaid diagrams instead of ASCII art for visual explanations
- Add `title` attributes to code blocks where descriptive
- Escape curly braces in MDX outside of code blocks (wrap in backticks)

## Key Technical Notes

- Logger configuration: `logger: false` to disable, omit for default Pino logger, or pass custom logger object. Do NOT use `logger: console`.
- Async event handlers on ImapFlow client are not awaited by Node.js EventEmitter
- `getMailboxLock()` queues requests - avoid holding a lock while trying to acquire another in event handlers (causes deadlock)
- Node.js 20.0+ required (uses modern JS features)

## Analytics (Plausible, borrowed from emailengine.app)

`docusaurus.config.ts` loads `https://emailengine.app/a/pv.js` and posts events to `https://emailengine.app/a/e`. Those are not app paths: they are Caddy `handle` blocks in the `emailengine.app` vhost on srv-04, proxying to the self-hosted Plausible container that `plausible.emailengine.dev` fronts. **If those routes are renamed, analytics here dies silently**, with no error anywhere.

It is proxied because EasyPrivacy, which uBlock Origin and AdGuard both enable by default, carries `://plausible.*/js/script.` and `://plausible.*/api/event|`. Both match on the hostname prefix, so the direct `plausible.emailengine.dev` URLs load for nobody running a blocker.

Two things specific to this site:

- These are **third-party** requests, unlike the other sites on that proxy, which are all subdomains of `emailengine.app`. Blockers define third-party by registrable domain (eTLD+1), so anyone blocking third-party scripts wholesale still loses analytics here. The alternative was an `imapflow.com` subdomain pointed at srv-04 (what `www.nodemailer.com` does for nodemailer.com); that was considered and decided against, so this is a known, accepted gap rather than an oversight.
- `data-api` must be absolute. Without it, or with a relative path, the script derives its endpoint from its own src origin and would post to `https://emailengine.app/api/event`, which is not routed.
