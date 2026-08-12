---
sidebar_position: 1
slug: /
---

# ImapFlow

<div style={{textAlign: 'center'}}>
  <img src="/img/waving.png" alt="ImapFlow mascot" width="200" />
</div>

ImapFlow is a modern and easy-to-use IMAP client library for Node.js. The focus for ImapFlow is to provide an easy-to-use API over IMAP without requiring in-depth knowledge of the IMAP protocol.

```bash title="Install with npm"
npm install imapflow
```

## Key Features

- **Modern async/await API** - All methods return Promises for easy async handling
- **IMAP4rev2 support** - Automatically enables and uses IMAP4rev2 (RFC 9051) when the server supports it
- **Automatic extension handling** - IMAP extensions are handled automatically in the background
- **Message streaming** - Efficient handling of large mailboxes with async iterators
- **TypeScript support** - Full TypeScript type definitions included
- **Comprehensive IMAP support** - Supports all major IMAP operations and extensions
- **Mailbox locking** - Built-in locking mechanism for safe concurrent mailbox access
- **Proxy support** - SOCKS and HTTP CONNECT proxy support for secure connections
- **Gmail support** - Gmail-specific extensions including labels and raw search

:::tip ImapFlow powers EmailEngine
ImapFlow was built as the IMAP engine for [**EmailEngine**](https://emailengine.app/?utm_source=imapflow.com&utm_medium=inline&utm_campaign=oss-docs&utm_content=intro), a self-hosted email API from the same team. EmailEngine turns Gmail, Microsoft 365, and IMAP accounts into REST endpoints, with managed OAuth2 and webhooks for incoming mail.
:::

## Supported IMAP Extensions

ImapFlow implements [RFC 3501](https://www.rfc-editor.org/rfc/rfc3501.html) (IMAP4rev1) and [RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html) (IMAP4rev2). IMAP4rev2 mode is enabled automatically when the server supports it (opt out with the `disableIMAP4rev2` option). In addition, ImapFlow automatically detects and uses the following IMAP extensions when available:

| Extension | RFC | Description |
|-----------|-----|-------------|
| IMAP4rev2 | [RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html) | Latest IMAP protocol revision, folds in many extensions |
| IDLE | [RFC 2177](https://www.rfc-editor.org/rfc/rfc2177.html) | Real-time notifications without polling |
| CONDSTORE | [RFC 7162](https://www.rfc-editor.org/rfc/rfc7162.html) | Efficient change tracking with modification sequences |
| QRESYNC | [RFC 7162](https://www.rfc-editor.org/rfc/rfc7162.html) | Quick mailbox resynchronization |
| UIDPLUS | [RFC 4315](https://www.rfc-editor.org/rfc/rfc4315.html) | Enhanced UID operations with response data |
| MOVE | [RFC 6851](https://www.rfc-editor.org/rfc/rfc6851.html) | Atomic message move operation |
| ID | [RFC 2971](https://www.rfc-editor.org/rfc/rfc2971.html) | Client/server identification |
| NAMESPACE | [RFC 2342](https://www.rfc-editor.org/rfc/rfc2342.html) | Mailbox namespace information |
| COMPRESS=DEFLATE | [RFC 4978](https://www.rfc-editor.org/rfc/rfc4978.html) | Connection compression |
| UTF8=ACCEPT | [RFC 6855](https://www.rfc-editor.org/rfc/rfc6855.html) | UTF-8 mailbox names and headers |
| BINARY | [RFC 3516](https://www.rfc-editor.org/rfc/rfc3516.html) | Binary content transfer |
| SPECIAL-USE | [RFC 6154](https://www.rfc-editor.org/rfc/rfc6154.html) | Standard mailbox roles (Sent, Trash, etc.) |
| ESEARCH | [RFC 4731](https://www.rfc-editor.org/rfc/rfc4731.html) | Extended search results (MIN, MAX, COUNT) |
| LIST-STATUS | [RFC 5819](https://www.rfc-editor.org/rfc/rfc5819.html) | Mailbox status inline with LIST |
| STATUS=SIZE | [RFC 8438](https://www.rfc-editor.org/rfc/rfc8438.html) | Total mailbox size in STATUS responses |
| X-GM-EXT-1 | [Google](https://developers.google.com/workspace/gmail/imap/imap-extensions) | Gmail-specific features (labels, search) |
| OBJECTID | [RFC 8474](https://www.rfc-editor.org/rfc/rfc8474.html) | Unique object identifiers |
| QUOTA | [RFC 9208](https://www.rfc-editor.org/rfc/rfc9208.html) | Mailbox storage quota |

## Quick Example

```js title="Basic usage example"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
});

const main = async () => {
    // Connect and authenticate
    await client.connect();

    // Select a mailbox
    let lock = await client.getMailboxLock('INBOX');
    try {
        // Fetch latest message
        let message = await client.fetchOne('*', {
            envelope: true,
            source: true
        });
        console.log(message.envelope.subject);
    } finally {
        lock.release();
    }

    // Logout
    await client.logout();
};

main().catch(console.error);
```

## Why ImapFlow?

Managing an IMAP connection can be complex, but if you're looking for an easy way to integrate email accounts, ImapFlow provides a clean, promise-based API that abstracts away the complexity of the IMAP protocol.

## What's Next?

- [Installation](./getting-started/installation.md) - Get started with ImapFlow
- [Quick Start](./getting-started/quick-start.md) - Your first ImapFlow application
- [Basic Usage](./guides/basic-usage.md) - Learn the core concepts
- [API Reference](./api/imapflow-client.md) - Detailed API documentation
