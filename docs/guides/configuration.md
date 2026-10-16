---
sidebar_position: 2
---

# Configuration

<div style={{textAlign: 'center'}}>
  <img src="/img/storing.png" alt="Configuring ImapFlow" width="200" />
</div>

This guide covers all configuration options available when creating an ImapFlow client.

## Basic Configuration

The minimal configuration requires just the server details and authentication:

```js title="Minimal configuration"
const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
});
```

## Connection Options

### host

The IMAP server hostname or IP address. Defaults to `localhost`, so in practice you always set it.

```js
{
    host: 'imap.gmail.com'
}
```

### port

The port to connect to. Defaults to `993` (IMAPS) when `secure` is `true`, and to `143` (cleartext/STARTTLS) otherwise. As a special case, setting `port: 993` without specifying `secure` implies `secure: true`.

```js
{
    port: 993
}
```

### secure

Whether to use TLS for the connection. If `true`, establishes the connection directly over TLS (implicit TLS, usually port 993). If `false`, a plain connection is used first and upgraded to TLS with STARTTLS when the server offers it, see [doSTARTTLS](#dostarttls) for the exact policy. When `secure` is not set, it defaults to `true` for port 993 and `false` for any other port.

```js
{
    secure: true  // Use TLS (recommended)
}
```

### doSTARTTLS

Controls STARTTLS behavior for a connection that was not opened with `secure: true`:

- `true` - Start unencrypted and upgrade to TLS using STARTTLS before authentication. `connect()` fails if the server does not offer STARTTLS.
- `false` - Never use STARTTLS, even if the server supports it. The whole session, credentials included, stays in cleartext.
- `undefined` (default) - Upgrade with STARTTLS when the server offers it, otherwise continue in cleartext and log a warning.

The default is opportunistic. The capability list that announces STARTTLS is itself received in cleartext, so an attacker on the network path can strip it and keep the connection unencrypted. Set `doSTARTTLS: true` whenever credentials must never cross the wire unencrypted.

```js
{
    secure: false,
    doSTARTTLS: true  // Require STARTTLS upgrade
}
```

**Note:** Setting both `secure: true` and `doSTARTTLS: true` is a misconfiguration, and `connect()` rejects with an error.

### servername

Servername for SNI (Server Name Indication) and certificate validation. Defaults to `host` when `host` is a hostname. When `host` is an IP address no SNI name is sent unless you set `servername`.

```js
{
    host: '192.168.1.100',
    servername: 'mail.example.com'
}
```

## Authentication Options

### Basic Authentication

Username and password authentication:

```js
{
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
}
```

When the server advertises `AUTH=PLAIN` or `AUTH=LOGIN`, ImapFlow authenticates with SASL PLAIN (preferred) or SASL LOGIN. Otherwise it uses the IMAP `LOGIN` command. If the server advertises `LOGINDISABLED` and no SASL mechanism, `connect()` rejects with an `AuthenticationFailure`.

### OAuth2 Authentication

For services that support OAuth2 (Gmail, Microsoft 365, etc.), pass an access token instead of a password:

```js
{
    auth: {
        user: 'user@example.com',
        accessToken: 'ya29.a0AfH6SMBx...'
    }
}
```

ImapFlow authenticates with [OAUTHBEARER (RFC 7628)](https://www.rfc-editor.org/rfc/rfc7628.html) when the server advertises it, and with XOAUTH2 otherwise. When `accessToken` is set, `pass` is ignored. If the server advertises neither mechanism, authentication fails.

:::tip
ImapFlow expects you to supply a valid access token and does not refresh tokens itself. Obtaining that token, registering the OAuth2 application, running the consent flow, and renewing tokens before they expire, is usually the hardest part of a mailbox integration. If you would rather not build it, [**EmailEngine**](https://emailengine.app/?utm_source=imapflow.com&utm_medium=inline&utm_campaign=oss-docs&utm_content=configuration) manages OAuth2 apps and token refresh for Gmail and Microsoft 365, and runs ImapFlow under the hood.
:::

### Custom Authentication Method

Force a specific authentication method instead of the automatic selection:

```js
{
    auth: {
        user: 'user@example.com',
        pass: 'password',
        loginMethod: 'AUTH=PLAIN'  // or 'AUTH=LOGIN' or 'LOGIN'
    }
}
```

- `AUTH=PLAIN` - SASL PLAIN ([RFC 4616](https://www.rfc-editor.org/rfc/rfc4616.html))
- `AUTH=LOGIN` - SASL LOGIN, a two-step challenge and response
- `LOGIN` - the plain IMAP `LOGIN` command

When `loginMethod` is not set and the username contains a `\` or a `/` (for example `DOMAIN\user` or `user@example.com/shared@example.com` on Microsoft Exchange), the `LOGIN` command is used automatically.

### Admin Impersonation (SASL PLAIN with authzid)

For admin access to user mailboxes (Zimbra, Dovecot, etc.):

```js
{
    auth: {
        user: 'admin@example.com',      // Admin credentials
        pass: 'adminpassword',
        authzid: 'user@example.com',    // User to impersonate
        loginMethod: 'AUTH=PLAIN'       // Makes sure SASL PLAIN is used
    }
}
```

**Note:** The `authzid` parameter is only sent with the `AUTH=PLAIN` mechanism and is silently ignored by the other methods. Set `loginMethod: 'AUTH=PLAIN'` so a fallback to `AUTH=LOGIN` or `LOGIN` can not drop it. The server must support admin delegation/impersonation.

## TLS Options

### tls

Additional TLS options, passed to Node.js [`tls.connect()`](https://nodejs.org/api/tls.html#tlsconnectoptions-callback) both for implicit TLS and for the STARTTLS upgrade. ImapFlow adds no TLS defaults of its own, so Node.js defaults apply to everything you do not set:

```js
{
    tls: {
        rejectUnauthorized: true,  // Verify server certificate (default: true)
        minVersion: 'TLSv1.2',     // Minimum TLS version
        minDHSize: 1024            // Minimum DH parameter size
    }
}
```

### Accepting Self-Signed Certificates

**Warning:** Only use this for testing/development:

```js
{
    tls: {
        rejectUnauthorized: false
    }
}
```

## Proxy Configuration

Set `proxy` to a proxy URL to tunnel the connection. Supported schemes are `http:` and `https:` (HTTP CONNECT) and `socks:`, `socks4:`, `socks4a:` and `socks5:`. Credentials in the URL are used for proxy authentication. IPv6 proxy endpoints use the bracketed URL form, for example `socks5://[2001:db8::1]:1080`. Proxy DNS lookups and negotiation count toward `connectionTimeout`.

### SOCKS Proxy

```js
{
    proxy: 'socks://proxy.example.com:1080'
}
```

### SOCKS Proxy with Authentication

```js
{
    proxy: 'socks://username:password@proxy.example.com:1080'
}
```

### HTTP CONNECT Proxy

```js
{
    proxy: 'http://proxy.example.com:8080'
    // or connect to the proxy itself over TLS, with Basic authentication
    // proxy: 'https://username:password@proxy.example.com:443'
}
```

The port defaults to `80` for `http:`, `443` for `https:` and `1080` for SOCKS.

### SOCKS4/SOCKS5 Specific

```js
{
    proxy: 'socks5://proxy.example.com:1080'
    // or 'socks4://...' or 'socks4a://...'
}
```

The destination hostname is resolved differently per protocol:

- `http:`, `https:`, `socks:` and `socks5:` send the IMAP server hostname to the proxy unresolved, so DNS happens on the proxy side.
- `socks4a:` sends the hostname to the proxy as well, but does not support IPv6 destinations.
- `socks4:` resolves the hostname locally to an IPv4 address, because SOCKS4 has no hostname or IPv6 address type.

## Custom Transport

By default ImapFlow opens its connection with Node.js `net` and `tls`. The `transport` option replaces that with your own socket layer, for runtimes that have no `node:net` or `node:tls` (celld, browsers) or for connections that are not TCP at all. Available since ImapFlow 2.5.0. A transport can not be combined with `proxy`, that combination fails with the error code `UnsupportedTransportOption`.

### cloudflare:sockets (celld, Cloudflare Workers)

`createSocketsTransport()` builds a transport from the `connect()` function of the `cloudflare:sockets` API:

```js title="Connecting through cloudflare:sockets"
import { connect } from 'cloudflare:sockets';
import { ImapFlow, createSocketsTransport } from 'imapflow';

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: { user: 'user@example.com', pass: 'password' },
    transport: createSocketsTransport(connect)
});
```

Implicit TLS, cleartext and STARTTLS all work. These runtimes always verify the server certificate against their own root store and take the SNI name from the hostname, so the options that would change that are refused with `UnsupportedTransportOption` instead of being ignored:

- `tls.rejectUnauthorized: false`
- a custom `tls.ca`, and client certificates (`tls.cert`, `tls.key`, `tls.pfx`, `tls.passphrase`) or `tls.checkServerIdentity`
- a `servername` that differs from `host`

The runtime reports no cipher details, so `client.tls` stays `false` on a secure connection.

### Socket APIs Built on Web Streams

`createStreamsTransport()` adapts any socket API whose connection opens with a promise of a `ReadableStream` and a `WritableStream` of bytes, such as Chrome's Direct Sockets or an in-memory connection. `open()` gets the destination and `secure` (whether ImapFlow wants a TLS connection) and returns the connection; it may throw to refuse it. `upgrade()` starts TLS on an open connection after STARTTLS. Leave it out when the API can not do that: ImapFlow then treats the server as one without STARTTLS, which fails the connection with `err.tlsFailed` set when `doSTARTTLS: true`, and otherwise continues in cleartext with a warning.

```js title="A web streams socket API"
const { ImapFlow, createStreamsTransport } = require('imapflow');

const transport = createStreamsTransport({
    open: ({ host, port, secure }) => {
        const socket = openSocket(host, port, secure);
        return {
            opened: socket.opened.then(() => ({
                readable: socket.readable,
                writable: socket.writable,
                // optional: remoteAddress, remotePort, localAddress, localPort
                // optional for a TLS connection, reported as client.tls:
                // tls: { authorized: true, name: 'TLS_AES_256_GCM_SHA384', version: 'TLSv1.3' }
            })),
            close: () => socket.close()
        };
    },
    // optional
    upgrade: (connection, options) => startTls(connection)
});

const client = new ImapFlow({ host: 'imap.example.com', port: 143, auth, transport });
```

The transport stops reading once the server accepted STARTTLS, so the API never has to start TLS while a read is in flight, and releases the stream locks before `upgrade()` is called.

### Writing a Transport

A socket API built on events implements the transport itself. `connect(options, onConnect)` returns a Node.js `Duplex` stream of bytes, calls `onConnect` once the connection is up, and reports connection errors with an `error` event on the stream (or throws to refuse the connection right away). The stream also needs `setTimeout(ms)`, emitting `timeout` after `ms` without traffic like `net.Socket` does, which is the watchdog behind `socketTimeout`. `upgrade(socket, options, onSecure)` is optional and starts TLS after STARTTLS.

```js title="A transport over an event based socket"
const { Duplex } = require('stream');

const transport = {
    connect({ host, port, secure }, onConnect) {
        const conn = openConnection(host, port, secure);
        let timer;
        let timeout = 0;
        const touch = () => {
            clearTimeout(timer);
            if (timeout > 0) {
                timer = setTimeout(() => socket.emit('timeout'), timeout);
            }
        };
        const socket = new Duplex({
            read() {},
            write(chunk, encoding, callback) {
                touch();
                conn.send(chunk, callback);
            },
            destroy(err, callback) {
                clearTimeout(timer);
                conn.close();
                callback(err);
            }
        });
        socket.setTimeout = ms => {
            timeout = ms;
            touch();
            return socket;
        };
        conn.on('data', data => {
            touch();
            socket.push(data);
        });
        conn.on('end', () => socket.push(null));
        conn.on('error', err => socket.destroy(err));
        conn.on('connect', onConnect);
        return socket;
    }
};
```

## Logging Options

### logger

By default, ImapFlow logs through a built-in [Pino](https://getpino.io/) instance at the `info` level, written to stdout as JSON. You can provide a custom logger object, or disable logging by setting `logger: false`.

A custom logger needs `debug`, `info`, `warn` and `error` methods. `trace` and `fatal` are used when present. Every log call gets a single object argument with a `msg` property and fields such as `cid` (the connection ID), so a structured logger like Pino or Bunyan fits best. When the logger has no `error` or `fatal` method, those entries are written to `console.error` so they are never lost.

:::warning
Do not pass `console` as a logger. Use a structured logger such as Pino, or `logger: false`.
:::

### Custom Logger

```js
const pino = require('pino');

{
    logger: pino({
        level: 'debug'
    })
}
```

### Disable Logging

```js
{
    logger: false  // No logging
}
```

### logRaw

Log all raw data read from and written to the socket, encoded in base64. Client frames that carry credentials are replaced with a placeholder and marked with `hidden: true`. Raw data is logged at the `trace` level: the default Pino logger is lowered to `trace` automatically, a custom logger has to be set to `trace` itself.

```js
{
    logRaw: true
}
```

### emitLogs

Emit every log entry as a `log` event, in addition to passing it to the logger. This works with `logger: false` as well, so you can route log entries yourself. Each entry has `level`, `t` (timestamp in milliseconds), `cid` (connection ID) and `lo` (a per-connection sequence number) next to the logged fields:

```js
{
    emitLogs: true
}

client.on('log', entry => {
    console.log(`${entry.cid} ${entry.level}: ${entry.msg}`);
});
```

## Connection Management

:::info No Auto-Reconnect
ImapFlow does not automatically reconnect when the connection is lost. An `ImapFlow` instance holds a single connection, and calling `connect()` a second time rejects with the `InstanceReused` error code, so create a new instance to reconnect. See the [Basic Usage guide](./basic-usage.md#handling-disconnections) for information on handling disconnections.
:::

### connectionTimeout

Timeout for getting a usable transport, in milliseconds. A single budget covers DNS resolution, proxy negotiation and the TCP/TLS handshake. When it runs out, `connect()` rejects with the error code `CONNECT_TIMEOUT`:

```js
{
    connectionTimeout: 90000  // 90 seconds (default)
}
```

### greetingTimeout

Timeout for receiving the server greeting once the transport is up, in milliseconds. When it runs out, `connect()` rejects with the error code `GREETING_TIMEOUT`:

```js
{
    greetingTimeout: 16000  // 16 seconds (default)
}
```

### socketTimeout

Timeout for socket inactivity, in milliseconds. When nothing is received within this period and the quiet is expected (during IDLE, an open download or a held lock), ImapFlow sends a NOOP to check that the server is still there, and closes the connection if that NOOP fails. In any other case, such as a command that never gets an answer, the connection is closed with an `error` event carrying the code `ETIMEOUT`:

```js
{
    socketTimeout: 300000  // 5 minutes (default)
}
```

For all three timeouts, `0` or an invalid value means "use the default", not "no timeout".

### maxLockHoldTime

A mailbox lock held longer than this, in milliseconds, logs a `Mailbox lock held for a long time` warning. It is a diagnostic for forgotten `lock.release()` calls and does not release the lock. Defaults to 30 minutes, set to `0` or `false` to disable. It can also be set per lock with `getMailboxLock(path, { maxLockHoldTime })`:

```js
{
    maxLockHoldTime: 10 * 60 * 1000  // warn after 10 minutes
}
```

## Client Identification

### clientInfo

Client identification sent to the server with the [ID extension (RFC 2971)](https://www.rfc-editor.org/rfc/rfc2971.html), when the server supports it. Your values are merged over the defaults, which are `name: 'imapflow'`, the library `version`, `vendor: 'Postal Systems'` and a `support-url`. Diacritics are stripped from string values:

```js
{
    clientInfo: {
        name: 'My Email Client',
        version: '1.0.0',
        vendor: 'My Company',
        'support-url': 'https://support.example.com'
    }
}
```

After connecting, the server's own ID response is available as `client.serverInfo` (or `null` if the server does not support ID).

## IDLE and Polling Options

These options control the [IDLE extension (RFC 2177)](https://www.rfc-editor.org/rfc/rfc2177.html) behavior.

### disableAutoIdle

By default, ImapFlow automatically enters IDLE mode when a mailbox is selected and the connection has been inactive for `autoIdleDelay` (15 seconds). Disable this behavior:

```js
{
    disableAutoIdle: true
}
```

### autoIdleDelay

How long, in milliseconds, the connection has to be inactive before IDLE starts automatically. Defaults to `15000`. Keep it above the usual pause your code leaves between two commands, otherwise every command is followed by an IDLE that the next command has to break first. The value is capped just below `socketTimeout`. To turn auto-IDLE off use `disableAutoIdle`, not a very large delay:

```js
{
    autoIdleDelay: 30000  // start IDLE after 30 seconds of inactivity
}
```

### maxIdleTime

Automatically break and restart IDLE after specified milliseconds. Useful for servers that drop long-running IDLE connections. Not set by default, so IDLE runs until the next command. On servers without IDLE it also sets the polling interval, capped at 2 minutes:

```js
{
    maxIdleTime: 300000  // Restart IDLE every 5 minutes
}
```

### missingIdleCommand

Command to poll with when the server does not support IDLE. Polling runs every 2 minutes, or every `maxIdleTime` if that is shorter:

```js
{
    missingIdleCommand: 'NOOP'  // Default. Can also be 'SELECT' or 'STATUS'
}
```

- `NOOP` - lets the server report changes as untagged responses. Some servers only report changes after a new SELECT.
- `SELECT` - re-selects the current mailbox.
- `STATUS` - asks for the message count, UIDNEXT, UIDVALIDITY, unseen count and HIGHESTMODSEQ of the current mailbox.

## Extension Options

### disableCompression

Disable [COMPRESS=DEFLATE extension (RFC 4978)](https://www.rfc-editor.org/rfc/rfc4978.html) even if server supports it. Compression is enabled by default when available:

```js
{
    disableCompression: true
}
```

### disableBinary

Disable [BINARY extension (RFC 3516)](https://www.rfc-editor.org/rfc/rfc3516.html) for FETCH and APPEND operations. This also disables the FETCH side of BINARY that IMAP4rev2 servers provide without a separate capability:

```js
{
    disableBinary: true
}
```

### disableAutoEnable

Do not send the [ENABLE (RFC 5161)](https://www.rfc-editor.org/rfc/rfc5161.html) command that ImapFlow sends after login to turn on extensions ([CONDSTORE](https://www.rfc-editor.org/rfc/rfc7162.html), [UTF8=ACCEPT](https://www.rfc-editor.org/rfc/rfc6855.html), [QRESYNC](https://www.rfc-editor.org/rfc/rfc7162.html), [IMAP4rev2](https://www.rfc-editor.org/rfc/rfc9051.html)):

```js
{
    disableAutoEnable: true
}
```

### disableIMAP4rev2

By default, ImapFlow enables [IMAP4rev2 (RFC 9051)](https://www.rfc-editor.org/rfc/rfc9051.html) mode when the server advertises support for it. Use this option as a targeted opt-out for servers with broken IMAP4rev2 implementations without losing the other auto-enabled extensions. It also stops ImapFlow from treating the IMAP4rev2 advertisement as support for the features IMAP4rev2 includes, such as the extended LIST syntax. Servers known to misbehave in IMAP4rev2 mode (Strato RZimapd, detected from its ID response) are kept out of it automatically:

```js
{
    disableIMAP4rev2: true
}
```

Note that IMAP4rev2 removed the `\Recent` flag: on an IMAP4rev2 session the `recent` status counter is always reported as `0` and the `new`/`old`/`recent` search keys are rejected with an error.

### qresync

Also enable the [QRESYNC extension (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html), on top of CONDSTORE, when the server supports it. Defaults to `false`. With QRESYNC the server reports deleted messages with VANISHED responses, so `expunge` events carry a `uid` instead of a `seq`:

```js
{
    qresync: true
}
```

## Special Options

### verifyOnly

Connect, authenticate, and log out right away. `connect()` resolves if the credentials were accepted and rejects with an `AuthenticationFailure` (`err.authenticationFailed === true`) if they were not. Useful for testing credentials:

```js
const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: { user: 'user@example.com', pass: 'password' },
    verifyOnly: true
});

try {
    await client.connect();
    console.log('Credentials are valid');
} catch (err) {
    console.error(err.authenticationFailed ? 'Invalid credentials' : 'Connection failed', err.message);
}
```

### includeMailboxes

When used with `verifyOnly`, also list the mailboxes before logging out. The listing is kept internally and is not part of the public API, so to get the mailboxes call `list()` on a normal connection instead:

```js
{
    verifyOnly: true,
    includeMailboxes: true
}
```

### expungeHandler

Custom handler for deleted messages, called with the same object the `expunge` event would get. When set, the `expunge` event is not emitted. Unlike an event listener, the handler is awaited, and an error it throws is logged instead of being propagated:

```js
{
    expungeHandler: async (event) => {
        console.log(`Message ${event.uid || event.seq} was deleted from ${event.path}`);
    }
}
```

### id

Custom instance ID, used as the `cid` field in logs and available as `client.id`. A random ID is generated when not set:

```js
{
    id: 'connection-1'
}
```

### idHashAlgorithm

When the server provides no message ID of its own (through [OBJECTID (RFC 8474)](https://www.rfc-editor.org/rfc/rfc8474.html) or Gmail's X-GM-EXT-1), ImapFlow derives the `id` property of a fetched message by hashing the mailbox path, UIDVALIDITY and UID. This option sets the hash algorithm, and accepts any name Node.js `crypto` supports. Defaults to `'md5'`. A host running OpenSSL in FIPS mode does not offer MD5 and has to set another algorithm:

```js
{
    idHashAlgorithm: 'sha256'  // 64 character hex IDs
}
```

## Response Size Limits

These limits protect against a broken or malicious server that sends endless or oversized responses. Exceeding any of them is fatal: the connection fails with the error code shown and no further input is parsed. `Infinity` disables a limit.

| Option | Default | Error code | Limits |
|--------|---------|------------|--------|
| `maxLineLength` | 1 GB | `LineTooLarge` | One response line, without literals |
| `maxLiteralSize` | 1 GB | `LiteralTooLarge` | One literal block, for example a message body |
| `maxResponseSize` | 2 GB | `ResponseTooLarge` | One full response, all lines and literals combined |

Keep `maxResponseSize` above `maxLiteralSize`, because a response also carries framing around its literal. With equal values a literal of exactly the maximum size could not be received.

```js
{
    maxLiteralSize: 100 * 1024 * 1024,  // 100 MB
    maxResponseSize: 101 * 1024 * 1024
}
```

## Complete Configuration Example

```js title="Complete configuration example"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    // Connection
    host: 'imap.example.com',
    port: 993,
    secure: true,
    servername: 'mail.example.com',

    // Authentication
    auth: {
        user: 'user@example.com',
        pass: 'password'
    },

    // TLS
    tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    },

    // Proxy (optional)
    // proxy: 'socks://proxy.example.com:1080',

    // Logging (uses Pino by default, set to false to disable)
    // logger: false,

    // Timeouts
    connectionTimeout: 90000,
    greetingTimeout: 16000,
    socketTimeout: 300000,

    // Client identification
    clientInfo: {
        name: 'My Email Client',
        version: '1.0.0'
    },

    // IDLE behavior
    disableAutoIdle: false,
    maxIdleTime: 300000,

    // Extensions
    disableCompression: false,
    disableBinary: false,
    qresync: false
});
```

## Environment-Specific Configurations

### Development

```js title="Development configuration"
{
    // Logging uses the built-in Pino instance by default
    logRaw: true,  // Log raw IMAP data (base64 encoded) for debugging
    tls: {
        rejectUnauthorized: false  // Only for testing!
    }
}
```

### Production

```js title="Production configuration"
{
    logger: false,
    tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    },
    connectionTimeout: 90000,
    socketTimeout: 300000
}
```

## Next Steps

- Learn about [Basic Usage](./basic-usage.md)
- Explore [Fetching Messages](./fetching-messages.md)
- See [Code Examples](../examples/fetching-messages.md)
