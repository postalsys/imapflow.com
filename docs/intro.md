---
sidebar_position: 1
slug: /
---

# ImapFlow

ImapFlow is a modern and easy-to-use IMAP client library for Node.js. The focus for ImapFlow is to provide an easy-to-use API over IMAP without requiring in-depth knowledge of the IMAP protocol.

```bash title="Install with npm"
npm install imapflow
```

## Key Features

- **Modern async/await API** - All methods return Promises for easy async handling
- **Automatic extension handling** - IMAP extensions are handled automatically in the background
- **Message streaming** - Efficient handling of large mailboxes with async iterators
- **TypeScript support** - Full TypeScript type definitions included
- **Comprehensive IMAP support** - Supports all major IMAP operations and extensions
- **Mailbox locking** - Built-in locking mechanism for safe concurrent mailbox access
- **Proxy support** - SOCKS and HTTP CONNECT proxy support for secure connections
- **Gmail support** - Gmail-specific extensions including labels and raw search

:::tip Looking for a complete email gateway solution?
[**EmailEngine**](https://emailengine.app/?utm_source=imapflow&utm_campaign=imapflow&utm_medium=tip-link) is a self-hosted email gateway that provides REST API access to IMAP and SMTP accounts, webhooks for mailbox changes, and advanced features like OAuth2, delayed delivery, open and click tracking, bounce detection, and more.
:::

## Supported IMAP Extensions

ImapFlow implements [RFC 3501](https://www.rfc-editor.org/rfc/rfc3501.html) (IMAP4rev1) and automatically detects and uses the following IMAP extensions when available:

| Extension | RFC | Description |
|-----------|-----|-------------|
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

For production email integration needs, ImapFlow was built for [EmailEngine Email API](https://emailengine.app/), a self-hosted software that converts IMAP accounts into easy-to-use REST interfaces.

## What's Next?

- [Installation](./getting-started/installation.md) - Get started with ImapFlow
- [Quick Start](./getting-started/quick-start.md) - Your first ImapFlow application
- [Basic Usage](./guides/basic-usage.md) - Learn the core concepts
- [API Reference](./api/imapflow-client.md) - Detailed API documentation
