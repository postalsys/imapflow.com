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
- ImapFlow 2.0 is written in TypeScript and published as a dual ES module / CommonJS package. The examples use `require()`, `import { ImapFlow } from 'imapflow'` works the same. Bun, Deno 2 (`npm:imapflow`, needs `--allow-net --allow-env --allow-sys=hostname`), Cloudflare Workers (`nodejs_compat`), celld and browsers are supported with the limits listed in `docs/getting-started/installation.md`. celld and browsers need the `transport` option (2.5.0+): `createSocketsTransport(connect)` over `cloudflare:sockets`, `createStreamsTransport()` over any web streams socket API, or a hand-written transport, documented in `docs/guides/configuration.md#custom-transport`
- The shipped declarations are generated from the source with internal members stripped, so only what `docs/api/imapflow-client.md` documents (plus connection facts like `state`, `namespace`, `greeting`, `tls`) is visible to TypeScript consumers

## Analytics (Plausible, via a.imapflow.com)

`docusaurus.config.ts` loads `https://a.imapflow.com/pv.js` and posts events to `https://a.imapflow.com/e`. `a.imapflow.com` is an A record (Cloudflare DNS, unproxied) to 95.216.108.165 on srv-04, where a Caddy vhost in `/etc/caddy/Caddyfile` proxies both paths to the self-hosted Plausible container that `plausible.emailengine.dev` fronts. **If the DNS record, the vhost or its paths change, analytics here dies silently**, with no error anywhere.

History: this used to load from `emailengine.app/a/pv.js` and `/a/e`. When emailengine.app moved to GitHub Pages those routes started returning 404 and analytics stopped. `a.imapflow.com` replaced them, following the `a.inboxclassic.com` pattern.

It is proxied because EasyPrivacy, which uBlock Origin and AdGuard both enable by default, carries `://plausible.*/js/script.` and `://plausible.*/api/event|`. Both match on the hostname prefix, so the direct `plausible.emailengine.dev` URLs load for nobody running a blocker. Being a subdomain of imapflow.com, the requests are first-party, so blocking third-party scripts does not drop them either.

`data-api` must be absolute. Without it the script derives its endpoint from its own src origin and would post to `https://a.imapflow.com/api/event`, which is not routed.
