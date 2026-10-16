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

ImapFlow also runs on Bun, Deno, Cloudflare Workers, celld and in browsers, see [Other runtimes](#other-runtimes) below.

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

The option, result and event types are exported from the package root, so a program can name them directly. The `AuthenticationFailure` error class, the `ImapFlowError` shape of the errors the client rejects with, and the `ImapFlowErrorCode` object of known error codes (for checks like `err.code === ImapFlowErrorCode.NoConnection`) are exported as well.

```typescript title="Importing types"
import type { ImapFlowOptions, FetchMessageObject, MailboxObject, SearchObject, ImapFlowEvents } from 'imapflow';
import { AuthenticationFailure, ImapFlowErrorCode } from 'imapflow';

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

The ES module build runs on [Bun](https://bun.sh/), tested against the latest Bun release, on [Deno](#deno), on [Cloudflare Workers](https://developers.cloudflare.com/workers/) with the `nodejs_compat` compatibility flag, on [celld](#celld), and [in browsers](#browsers).

```toml title="wrangler.toml"
compatibility_flags = ["nodejs_compat"]
```

On Workers, implicit TLS (`secure: true`, usually port 993) and cleartext work over the default `node:net` and `node:tls`. A STARTTLS upgrade over them fails with a TLS error, because the runtime can only upgrade a socket that has no read in flight. Connect through [`createSocketsTransport()`](../guides/configuration.md#custom-transport) to use STARTTLS on Workers (ImapFlow 2.5.0 or newer):

```js title="worker.js"
import { connect } from 'cloudflare:sockets';
import { ImapFlow, createSocketsTransport } from 'imapflow';

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 143,
    doSTARTTLS: true,
    auth: { user: 'user@example.com', pass: 'password' },
    transport: createSocketsTransport(connect)
});
```

The runtime does not allow turning certificate validation off, so `tls: { rejectUnauthorized: false }` is rejected with `ERR_OPTION_NOT_IMPLEMENTED` (with the transport: `UnsupportedTransportOption`). COMPRESS=DEFLATE, IDLE and the default Pino logger work as on Node.js.

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

### celld

[celld](https://celld.dev/) is a self-hosted runtime for Cloudflare-style Workers. It has no `node:net`, `node:tls` or `node:dns`, so connect through the `transport` option with the `connect()` of `cloudflare:sockets` (ImapFlow 2.5.0 or newer). Without it, `connect()` fails with "node:net.connect is not implemented in celld".

```js title="worker.js"
import { connect } from 'cloudflare:sockets';
import { ImapFlow, createSocketsTransport } from 'imapflow';

export default {
    async fetch(request, env, ctx) {
        const client = new ImapFlow({
            host: 'imap.example.com',
            port: 993,
            secure: true,
            auth: { user: 'user@example.com', pass: 'password' },
            logger: false,
            transport: createSocketsTransport(connect)
        });
        await client.connect();
        const status = await client.status('INBOX', { messages: true });
        await client.logout();
        return Response.json(status);
    }
};
```

Implicit TLS, STARTTLS, cleartext, IDLE, `download()` and the default Pino logger work. Compared with Node.js:

- The server certificate is always verified against the runtime's root store. `tls.rejectUnauthorized: false`, a custom `tls.ca`, client certificates and a `servername` that differs from `host` are refused with `UnsupportedTransportOption`, and a TLS connection to an IP address needs a certificate issued for that address.
- COMPRESS=DEFLATE is skipped, the runtime has no streaming zlib.
- The `proxy` option can not be combined with a transport.
- `client.tls` stays `false`, the runtime reports no cipher details.
- A socket is closed when the request (or Durable Object event) that opened it ends. Run the whole session inside the handler, or inside `ctx.waitUntil()` to keep it going after the response. A connection can not be kept open between requests.

### Browsers

ImapFlow runs in a browser from the ES module build, bundled together with replacements for the Node.js modules it imports. Browsers have no sockets, so the connection comes from a [custom transport](../guides/configuration.md#custom-transport): a socket API such as Chrome's Direct Sockets (Isolated Web Apps only), a WebSocket relay to a TCP proxy, or an in-memory connection. Regular browser extensions have no raw TCP access.

The bundler has to provide:

- `node:stream` from [readable-stream](https://www.npmjs.com/package/readable-stream), `node:events` from [events](https://www.npmjs.com/package/events), and the `Buffer` global from [buffer](https://www.npmjs.com/package/buffer)
- the `process` global from [process](https://www.npmjs.com/package/process), and `setImmediate()` and `clearImmediate()` globals
- `node:crypto` with an MD5 `createHash()`, used for message ids on servers without OBJECTID, and `path` with `parse()`, used by a dependency for attachment file names
- empty modules for `node:net`, `node:tls`, `node:dns` and `node:zlib`, which makes ImapFlow skip COMPRESS

The ImapFlow repository has a complete esbuild setup with the shims in [`test/browser/`](https://github.com/postalsys/imapflow/tree/master/test/browser), which runs a full session in headless Chrome.

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
