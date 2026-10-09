---
sidebar_position: 1
---

# Installation

<div style={{textAlign: 'center'}}>
  <img src="/img/connecting.png" alt="Connecting to IMAP server" width="200" />
</div>

## Requirements

- Node.js version 20.0 or higher
- npm or yarn package manager

ImapFlow also runs on Bun, Deno and Cloudflare Workers, see [Other runtimes](#other-runtimes) below.

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

## ES Modules and CommonJS

ImapFlow is published as a dual package with an ES module build and a CommonJS build. Use whichever module system your project uses, the API is the same.

```js title="ES module import"
import { ImapFlow } from 'imapflow';
```

```js title="CommonJS require"
const { ImapFlow } = require('imapflow');
```

The default export is an object with the `ImapFlow` and `AuthenticationFailure` classes, so `import imapflow from 'imapflow'` followed by `new imapflow.ImapFlow()` works as well. The examples in this documentation use `require()`, every one of them works the same way with `import`.

## TypeScript Support

ImapFlow is written in TypeScript and ships its type declarations with the package, one set for each build. No additional `@types` packages are needed.

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

The option, result and event types are exported from the package root, so a program can name them directly. The `AuthenticationFailure` error class and the `ImapFlowError` shape of the errors the client rejects with are exported as well.

```typescript title="Importing types"
import type { ImapFlowOptions, FetchMessageObject, MailboxObject, SearchObject, ImapFlowEvents } from 'imapflow';
import { AuthenticationFailure } from 'imapflow';

const options: ImapFlowOptions = {
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    },
    logger: false
};
```

Events are typed from the event name, so the listener of `client.on('exists', ...)` receives the `ExistsEvent` object without an annotation. Every optional property accepts an explicit `undefined`, so the declarations also work with `exactOptionalPropertyTypes` enabled.

## Other Runtimes

The ES module build runs on [Bun](https://bun.sh/), tested against the latest Bun release, on [Deno](#deno), and on [Cloudflare Workers](https://developers.cloudflare.com/workers/) with the `nodejs_compat` compatibility flag.

```toml title="wrangler.toml"
compatibility_flags = ["nodejs_compat"]
```

On Workers, connect with implicit TLS (`secure: true`, usually port 993) or in cleartext. The runtime can not upgrade an already connected socket, so a STARTTLS negotiation fails with a TLS error, and it does not allow turning certificate validation off, so `tls: { rejectUnauthorized: false }` is rejected with `ERR_OPTION_NOT_IMPLEMENTED`. COMPRESS=DEFLATE, IDLE and the default Pino logger work as on Node.js.

### Deno

ImapFlow runs on [Deno](https://deno.com/) 2 through its npm compatibility layer. Import it with an `npm:` specifier, or add it to the project with `deno add npm:imapflow` and import it as `imapflow`. The shipped type declarations are picked up by `deno check` as well.

```js title="main.js"
import { ImapFlow } from 'npm:imapflow';

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    },
    logger: false
});

await client.connect();
console.log(await client.status('INBOX', { messages: true }));
await client.logout();
```

The program needs network, environment and hostname access. The environment and hostname permissions are required even with `logger: false`, because the Pino logger is loaded together with the library and reads both when it loads.

```bash title="Run with Deno"
deno run --allow-net=imap.example.com:993 --allow-env --allow-sys=hostname main.js
```

Implicit TLS, STARTTLS, `tls: { rejectUnauthorized: false }`, COMPRESS=DEFLATE, IDLE and the default Pino logger work as on Node.js. The differences show up only when the server ends the connection abruptly:

- If the server sends a response and closes the connection immediately after it, Deno reports the close before that response is processed. The connection is still closed and every pending command is rejected, but a final `BYE` text does not make it into `error.reason` or `client.byeReason`, and a server that drops the connection right after accepting STARTTLS produces a `ClosedAfterConnectText` error without the `tlsFailed` flag.
- A connection reset after the TLS layer is established is reported as `ClosedAfterConnectTLS` instead of `ECONNRESET`.

## Upgrading from ImapFlow 1.x

ImapFlow 2.0 is the TypeScript rewrite of the library. The API is unchanged, but a few packaging details are different:

- Node.js 20 or newer is required.
- The `lib/` directory is no longer published. Load the package from its root as shown above. A deep import such as `imapflow/lib/tools` keeps resolving through the package's export map, but only the root entry is a supported API.
- The hand-written declaration file is replaced by declarations generated from the source. Internal members of the client are no longer visible to TypeScript, and every optional property is declared as accepting `undefined`.

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
