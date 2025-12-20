---
sidebar_position: 1
---

# Installation

## Requirements

- Node.js version 14.0 or higher
- npm or yarn package manager

## Install via npm

Install ImapFlow using npm:

```bash title="Install with npm"
npm install imapflow
```

## Install via yarn

Alternatively, you can use yarn:

```bash title="Install with yarn"
yarn add imapflow
```

## TypeScript Support

ImapFlow includes TypeScript type definitions out of the box. No additional `@types` packages are needed.

```typescript title="TypeScript usage"
import { ImapFlow } from 'imapflow';

const client: ImapFlow = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
});
```

## Verify Installation

After installation, verify that ImapFlow is installed correctly:

```bash title="Verify installation"
npm list imapflow
```

You should see the installed version of ImapFlow in the output.

## Next Steps

Now that you have ImapFlow installed, you can:

- Learn the [Basic Usage](../guides/basic-usage.md)
- Explore [Configuration Options](../guides/configuration.md)
- Check out [Code Examples](../examples/fetching-messages.md)
