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
