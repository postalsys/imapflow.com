---
sidebar_position: 2
---

# Quick Start

<div style={{textAlign: 'center'}}>
  <img src="/img/pushing.png" alt="Getting started with ImapFlow" width="200" />
</div>

This guide will help you get started with ImapFlow in just a few minutes.

## Basic Connection

First, import the ImapFlow class and create a new client instance. The package works both as an ES module and with `require()`:

```js title="Create client instance"
const { ImapFlow } = require('imapflow');
// or as an ES module: import { ImapFlow } from 'imapflow';

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'your-password'
    },
    logger: false  // Disable logging. Omit to use the default Pino logger.
});
```

## Connecting to the Server

Use async/await to connect to the IMAP server:

```js title="Connect to server"
async function main() {
    // Wait until client connects and authorizes
    await client.connect();
    console.log('Connected to IMAP server');
}

main().catch(err => {
    console.error('Connection error:', err);
});
```

## Listing Mailboxes

List all available mailboxes:

```js title="List mailboxes"
// Get the mailbox tree
let tree = await client.listTree();
console.log(tree);

// Or list all mailboxes as a flat array
let list = await client.list();
for (let mailbox of list) {
    console.log(mailbox.path, mailbox.specialUse || '');
}
```

## Selecting a Mailbox

Before you can read or manipulate messages, you need to select a mailbox and acquire a lock:

```js title="Select and lock mailbox"
// Select and lock the INBOX
let lock = await client.getMailboxLock('INBOX');
try {
    console.log('Mailbox is locked');
    console.log('Messages in INBOX:', client.mailbox.exists);

    // Your mailbox operations go here

} finally {
    // Always release the lock
    lock.release();
}
```

## Reading Messages

Fetch the latest message:

```js title="Fetch latest message"
let lock = await client.getMailboxLock('INBOX');
try {
    // Check if mailbox has messages
    if (client.mailbox.exists === 0) {
        console.log('No messages in mailbox');
        return;
    }

    // Fetch the most recent message using '*' for the last message
    let message = await client.fetchOne('*', {
        envelope: true,
        bodyStructure: true
    });

    console.log('Subject:', message.envelope.subject);
    console.log('From:', message.envelope.from[0]?.address);
    console.log('Date:', message.envelope.date);
} finally {
    lock.release();
}
```

## Parsing Messages

Fetching with `source: true` returns the raw RFC 822 source of a message as a Buffer. ImapFlow does not turn that source into plain text, HTML and attachments, so use a MIME parser such as [postal-mime](https://www.npmjs.com/package/postal-mime) for that:

```bash title="Install postal-mime"
npm install postal-mime
```

```js title="Parse the latest message"
const PostalMime = require('postal-mime');

let lock = await client.getMailboxLock('INBOX');
try {
    // fetchOne() resolves to false when the mailbox is empty
    let msg = await client.fetchOne('*', { source: true });
    if (msg) {
        const email = await PostalMime.parse(msg.source);
        console.log('Subject:', email.subject);
        console.log('Text:', email.text);
        console.log('Attachments:', email.attachments.map(a => a.filename));
    }
} finally {
    lock.release();
}
```

See the [Parsing Messages examples](../examples/parsing-messages) for parsing `download()` streams, saving attachments and more.

## Iterating Over Messages

Use async iteration to process multiple messages:

```js title="Iterate over messages"
let lock = await client.getMailboxLock('INBOX');
try {
    // Fetch all messages (use only for small mailboxes)
    for await (let message of client.fetch('1:*', { envelope: true })) {
        console.log(`${message.uid}: ${message.envelope.subject}`);
    }
} finally {
    lock.release();
}
```

:::warning Important
Do not run any other IMAP commands inside the `fetch()` loop or it will deadlock. Use `fetchAll()` if you need to process messages after fetching.
:::

## Handling Errors and Disconnects

The client is an `EventEmitter`. Attach an `error` listener, otherwise an error emitted after `connect()` has resolved (a socket timeout, for example) is thrown as an uncaught exception. The `close` event fires when the connection ends for any reason.

```js title="Error and close events"
client.on('error', err => {
    console.error('IMAP error:', err.code, err.message);
});

client.on('close', () => {
    console.log('Connection closed');
});
```

ImapFlow does not reconnect on its own, and an `ImapFlow` instance can only connect once. Calling `connect()` a second time rejects with the `InstanceReused` error code, so create a new client to connect again.

## Closing the Connection

Always close the connection when done:

```js title="Close connection"
// Log out and close connection
await client.logout();
console.log('Disconnected');
```

## Complete Example

Here is a complete working example:

```js title="Complete example"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'your-password'
    }
});

async function main() {
    // Connect
    await client.connect();
    console.log('Connected');

    // List mailboxes
    let mailboxes = await client.list();
    console.log('Mailboxes:', mailboxes.map(m => m.path).join(', '));

    // Select INBOX
    let lock = await client.getMailboxLock('INBOX');
    try {
        console.log(`INBOX has ${client.mailbox.exists} messages`);

        if (client.mailbox.exists > 0) {
            // Fetch latest 10 messages (or all if less than 10)
            let first = Math.max(1, client.mailbox.exists - 9);
            let messages = await client.fetchAll(`${first}:*`, {
                envelope: true,
                flags: true
            });

            for (let message of messages) {
                const seen = message.flags.has('\\Seen') ? '' : '[UNREAD] ';
                console.log(`${seen}${message.uid}: ${message.envelope.subject}`);
            }
        }
    } finally {
        lock.release();
    }

    // Logout
    await client.logout();
    console.log('Disconnected');
}

main().catch(console.error);
```

## Common Provider Settings

### Gmail

```js title="Gmail configuration"
const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@gmail.com',
        accessToken: 'your-oauth2-token'  // OAuth2 access token
    }
});
```

Gmail also accepts an [app password](https://support.google.com/accounts/answer/185833) in `pass` for accounts with 2-Step Verification enabled, but OAuth2 is the recommended method.

### Outlook/Office 365

```js title="Outlook configuration"
const client = new ImapFlow({
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@outlook.com',
        accessToken: 'your-oauth2-token'  // Microsoft requires OAuth2
    }
});
```

Microsoft has turned off password (basic) authentication for IMAP in Exchange Online, so Microsoft 365 and Outlook.com accounts need an OAuth2 access token. ImapFlow does not obtain or refresh tokens, it uses the token you pass with the XOAUTH2 or OAUTHBEARER mechanism, whichever the server advertises.

### Yahoo Mail

```js title="Yahoo Mail configuration"
const client = new ImapFlow({
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@yahoo.com',
        pass: 'your-app-password'  // Use app password, not regular password
    }
});
```

## What's Next?

- Learn about [Configuration Options](../guides/configuration.md)
- Understand [Basic Usage](../guides/basic-usage.md)
- Explore [Message Fetching](../guides/fetching-messages.md)
- See more [Examples](../examples/fetching-messages.md)
