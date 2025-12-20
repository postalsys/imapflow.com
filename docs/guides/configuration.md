---
sidebar_position: 2
---

# Configuration

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

### host (required)

The IMAP server hostname.

```js
{
    host: 'imap.gmail.com'
}
```

### port

The port to connect to. Defaults to `993` for secure connections. If `secure` is `false` and port is not specified, the library defaults to port `993` when auto-detecting TLS based on port.

```js
{
    port: 993
}
```

### secure

Whether to use TLS for the connection. If `true`, establishes the connection directly over TLS. If `false`, a plain connection is used first and, if possible, upgraded to TLS via STARTTLS.

```js
{
    secure: true  // Use TLS (recommended)
}
```

### doSTARTTLS

Controls STARTTLS behavior explicitly:

- `true` - Start unencrypted and upgrade to TLS using STARTTLS before authentication. Fails if STARTTLS is not supported.
- `false` - Never use STARTTLS, even if the server supports it. Results in fully unencrypted connection when combined with `secure: false`.
- `undefined` (default) - Attempt STARTTLS if available when `secure: false`.

```js
{
    secure: false,
    doSTARTTLS: true  // Require STARTTLS upgrade
}
```

**Note:** Setting both `secure: true` and `doSTARTTLS: true` is invalid and will throw an error.

### servername

Optional servername for SNI (Server Name Indication). Useful when connecting via IP address.

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

### OAuth2 Authentication

For services that support OAuth2 (Gmail, Outlook, etc.):

```js
{
    auth: {
        user: 'user@example.com',
        accessToken: 'ya29.a0AfH6SMBx...'
    }
}
```

### Custom Authentication Method

Specify a custom authentication method:

```js
{
    auth: {
        user: 'user@example.com',
        pass: 'password',
        loginMethod: 'AUTH=PLAIN'  // or 'AUTH=LOGIN' or 'LOGIN'
    }
}
```

### Admin Impersonation (SASL PLAIN with authzid)

For admin access to user mailboxes (Zimbra, Dovecot, etc.):

```js
{
    auth: {
        user: 'admin@example.com',      // Admin credentials
        pass: 'adminpassword',
        authzid: 'user@example.com',    // User to impersonate
        loginMethod: 'AUTH=PLAIN'       // Required for authzid
    }
}
```

**Note:** The `authzid` parameter only works with the `AUTH=PLAIN` mechanism. The server must support admin delegation/impersonation.

## TLS Options

### tls

Additional TLS options (passed to Node.js TLS module):

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

ImapFlow supports both SOCKS and HTTP CONNECT proxies.

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
}
```

### SOCKS4/SOCKS5 Specific

```js
{
    proxy: 'socks4://proxy.example.com:1080'
    // or
    proxy: 'socks5://proxy.example.com:1080'
}
```

## Logging Options

### logger

By default, ImapFlow logs to console using [Pino](https://getpino.io/) format. You can provide a custom logger or disable logging.

### Custom Logger

Use a custom logger instance. The logger must have `debug`, `info`, `warn`, and `error` methods:

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
    logger: false  // No logging (default)
}
```

### logRaw

Log all raw data read and written to socket in base64 encoding:

```js
{
    logRaw: true
}
```

### emitLogs

Emit log entries as events instead of (or in addition to) logging:

```js
{
    emitLogs: true
}

client.on('log', (entry) => {
    console.log(`${entry.level}: ${entry.msg}`);
});
```

## Connection Management

:::info No Auto-Reconnect
ImapFlow does not automatically reconnect when the connection is lost. See the [Basic Usage guide](./basic-usage.md#handling-disconnections) for information on handling disconnections.
:::

### connectionTimeout

Timeout for establishing a connection (in milliseconds):

```js
{
    connectionTimeout: 90000  // 90 seconds (default)
}
```

### greetingTimeout

Timeout for receiving server greeting after connection (in milliseconds):

```js
{
    greetingTimeout: 16000  // 16 seconds (default)
}
```

### socketTimeout

Timeout for socket inactivity (in milliseconds). Connection is terminated if no data is received within this period:

```js
{
    socketTimeout: 300000  // 5 minutes (default)
}
```

## Client Identification

### clientInfo

Client identification sent to the server via the ID extension:

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

After connecting, you can access server identification via `client.serverInfo`.

## IDLE and Polling Options

These options control the [IDLE extension (RFC 2177)](https://www.rfc-editor.org/rfc/rfc2177.html) behavior.

### disableAutoIdle

By default, ImapFlow automatically enters IDLE mode after 15 seconds of inactivity. Disable this behavior:

```js
{
    disableAutoIdle: true
}
```

### maxIdleTime

Automatically break and restart IDLE after specified milliseconds. Useful for servers that drop long-running IDLE connections:

```js
{
    maxIdleTime: 300000  // Restart IDLE every 5 minutes
}
```

### missingIdleCommand

Command to use for staying connected if server does not support IDLE:

```js
{
    missingIdleCommand: 'NOOP'  // Default. Can also be 'SELECT' or 'STATUS'
}
```

## Extension Options

### disableCompression

Disable [COMPRESS=DEFLATE extension (RFC 4978)](https://www.rfc-editor.org/rfc/rfc4978.html) even if server supports it:

```js
{
    disableCompression: true
}
```

### disableBinary

Disable [BINARY extension (RFC 3516)](https://www.rfc-editor.org/rfc/rfc3516.html) for FETCH and APPEND operations:

```js
{
    disableBinary: true
}
```

### disableAutoEnable

Do not automatically enable extensions ([CONDSTORE](https://www.rfc-editor.org/rfc/rfc7162.html), [UTF8=ACCEPT](https://www.rfc-editor.org/rfc/rfc6855.html), [QRESYNC](https://www.rfc-editor.org/rfc/rfc7162.html)):

```js
{
    disableAutoEnable: true
}
```

### qresync

Enable [QRESYNC extension (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html) support. When enabled, EXPUNGE notifications include UID instead of sequence number:

```js
{
    qresync: true
}
```

## Special Options

### verifyOnly

Connect, authenticate, and immediately disconnect. Useful for testing credentials:

```js
{
    verifyOnly: true
}
```

### includeMailboxes

When used with `verifyOnly`, also fetch the list of mailboxes:

```js
{
    verifyOnly: true,
    includeMailboxes: true
}
```

### expungeHandler

Custom handler for EXPUNGE events. When set, the `expunge` event is not emitted:

```js
{
    expungeHandler: async (event) => {
        console.log(`Message ${event.uid || event.seq} was deleted from ${event.path}`);
    }
}
```

### id

Custom instance ID for logs:

```js
{
    id: 'connection-1'
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
    // Logging is enabled by default (Pino format)
    logRaw: true,  // Log raw IMAP data for debugging
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
